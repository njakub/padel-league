# Restructure: League → Season → Round

## Context

The app currently hardcodes three categories (Sunday / Wednesday / Adhoc) as tabs, with `Season.leagueType` conditionals leaking into every layer. That goes away. The Wednesday pattern is the keeper: short fixed-pairing blocks that feed an overall tally — but the naming is wrong. Each current "season" is really **one pairing configuration** played over 1–2 nights; after 7 of them (8 players → everyone has partnered everyone once) that's one real season.

**Decisions confirmed:**
- Hierarchy: **League (all-time) → Season (full partner cycle, ends when everyone has partnered everyone — 7 rounds for 8 players) → Round (one pairing block; today's `Season` DB row) → Match**.
- Today's "season" renames to **Round**.
- **Sunday and Adhoc data can be deleted entirely** (after a backup). Only the Wednesday league data must survive, with identical stats.
- Leagues should be extensible (different rules / player counts later) via a format registry — but v1 ships with the americano-pairs format only.
- Home UI: league **list/cards**, not tabs.
- Multi-group + auth: **out of scope** (restructure first; `League` can gain `groupId` later).

## Target model & standings semantics

- **Round**: pair standings ranked by points scored (exactly today's Wednesday round view).
- **Season**: player standings = `calculateStandings` (americano style) over all matches of its rounds; champion = top player when season completes. Auto-completes when its 7th round is completed (fixed count, not coverage detection — attendance/subs make coverage ill-defined); manual "End Season Early" also available.
- **League**: all-time player tally + pairings over matches in completed rounds (identical numbers to today's Wednesday "Overall League Tally") + list of past seasons with champions.

### Fairness improvement
Make `suggest-pairs` **season-aware**: hard-exclude partners already used *this season* (currently all-time history is soft-penalized, so last season's pairs are unfairly blocked and in-season repeats are merely discouraged), and verify the chosen partition can still extend to a complete everyone-partners-everyone cycle (backtracking over the 105 partitions/round — trivial at this scale). Balance (strong+weak rank pairing) stays as the tiebreak. This guarantees the season actually completes the cycle. (Phase 4.)

## Schema (additive only; physical `"Season"` table never renamed)

```prisma
model League {
  id        Int      @id @default(autoincrement())
  slug      String   @unique        // backfill idempotency key
  name      String
  format    String                  // "americano-pairs" (registry id)
  createdAt DateTime @default(now())
  seasons   LeagueSeason[]
  rounds    Round[]
}

model LeagueSeason {
  id          Int       @id @default(autoincrement())
  leagueId    Int
  league      League    @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  number      Int                      // Season 1, 2, …
  status      String    @default("ACTIVE") // ACTIVE | COMPLETED
  createdAt   DateTime  @default(now())
  completedAt DateTime?
  rounds      Round[]
  @@unique([leagueId, number])
}

// existing "Season" table, renamed at the Prisma level only
model Round {
  // existing: id, name, createdAt, status, totalMatches, leagueType (legacy, dual-written for rollback)
  leagueId       Int?           // new, nullable
  leagueSeasonId Int?           // new, nullable
  roundNumber    Int?           // new, 1-based within season, persisted (not recomputed)
  @@map("Season")
}

model Match {
  roundId Int @map("seasonId")   // physical column unchanged
  round   Round @relation(...)
  @@unique([roundId, matchNumber], map: "Match_seasonId_matchNumber_key") // pin index name
  // everything else unchanged
}
```

Gate the rename with `prisma migrate diff` → must be **empty DDL**; pin any constraint names it flags with `map:`.

## Format registry — `lib/formats.ts` (new, pure TS)

```ts
export interface FormatDescriptor {
  id: "americano-pairs";                 // union grows later ("americano-rotating", …)
  label: string;
  scoringStyle: ScoringStyle;            // drives scoring.ts + MatchResultForm
  roundStandings: "pairs" | "players";
  roster: { kind: "pick-pairs"; size: 8 };
  roundLengths: number[];                // [6, 12, 18, 24]
  seasonRounds: number;                  // 7
  legacyLeagueType: "WEDNESDAY";         // dual-write value
  buildSchedule(totalMatches, { pairs }): MatchRow[];  // wraps generateSchedulePairs + mapToPlayerIdsPairs
}
export const FORMATS: Record<FormatId, FormatDescriptor>;
export function getFormat(id: string): FormatDescriptor;  // throws on unknown
```

Client components never branch on format ids — they receive resolved primitives (`scoringStyle`, etc.) as props. Later formats (rotating-8 via the unused verified `lib/schedule-generator-8.ts`, other player counts, casual) are new registry entries — noted, not built now.

## Migration / backfill sequence

1. **Backup**: `pg_dump` of prod + Neon branch for rehearsal. (Sunday/adhoc deletion is destructive — this is the safety net.)
2. **Migration A** (Phase 1): Prisma-only rename `Season`→`Round` + `@@map`, `seasonId`→`roundId` + `@map`. Empty DDL. Codemod `prisma.season.*`→`prisma.round.*`.
3. **Migration B** (Phase 2): create `League`, `LeagueSeason`; add nullable `leagueId`/`leagueSeasonId`/`roundNumber` to `"Season"`.
4. **Backfill script** `scripts/backfill-leagues.ts` (tsx, `--dry-run` mode, idempotent — every write is an upsert on a natural key or deterministic recompute):
   - Upsert League `slug: "wednesday"` (name "Wednesday League", format `americano-pairs`).
   - Fetch `leagueType="WEDNESDAY"` rounds ordered `createdAt asc, id asc`; chunk into groups of 7 via pure `groupRoundsIntoSeasons()` in `lib/season-grouping.ts` (unit-tested). Group i → upsert `LeagueSeason(leagueId, number: i+1)`; COMPLETED iff 7 rounds and all COMPLETED, else ACTIVE (trailing partial group = current open season). Set each round's `leagueId/leagueSeasonId/roundNumber (1–7)`.
   - **Delete** all `leagueType IN ("SUNDAY","ADHOC")` rounds (matches cascade). Optionally delete players left with zero matches.
   - Print report: rounds attached per season, deleted counts, orphans (must be 0).
5. Rehearse on the Neon branch (run app against it, compare all-time tally numbers to prod's Wednesday tab), then run on prod.
6. **Dual-write** from Phase 4: new round-creating actions also set `leagueType = "WEDNESDAY"` so a code rollback keeps working; re-run backfill after Phase 4 deploy to heal any window orphans.

## Server actions refactor (`app/actions.ts`)

| Today | Becomes |
|---|---|
| `createWednesdaySeason` | `createRound(leagueId, totalMatches, pairs, name?)` — finds-or-creates ACTIVE `LeagueSeason` (next number if none), sets `roundNumber`, default name "Round {n}"; validates one ACTIVE round per league |
| `completeSeason` | `completeRound(roundId)` — plus auto-complete the `LeagueSeason` when round `seasonRounds` (7) completes |
| — | `completeSeasonEarly(leagueSeasonId)`; `createLeague(name, formatId)` |
| `deleteSeason` | `deleteRound(roundId)` (newest-only, as today); delete emptied season |
| `recordMatchResult` | style from `getFormat(round.league.format).scoringStyle` (legacy fallback until Phase 6) |
| `suggestWednesdayPairs` | `suggestPairs(leagueId, playerIds)` — history scoped by `leagueId`; season-aware hard constraint + cycle-completion check (see fairness note) |
| `createSeason` (Sunday), `createAdhocSeason`, `addAdhocMatch`, `deleteAdhocMatch` | **deleted** (Phase 6) |
| `deleteMatchResult`, `createPlayer` | unchanged |

## Routes / UI

- `/` (rewrite `app/page.tsx`): **league card list** — name, active season "Round X of 7" progress, active round link, top-3 all-time tally teaser; `CreateLeagueButton`, `AddPlayerButton`. Deletes the 3 `buildXData` functions and the tab system.
- `app/league/[id]/page.tsx` (new): all-time tally (`StandingsTable`) + `PairingsTable`; seasons list with 🏆 champions (computed at read time); active season progress; `CreateRoundButton`; "End Season Early" behind an Advanced disclosure.
- `app/league/[id]/season/[number]/page.tsx` (new): season player standings, partner-coverage info ("21 of 28 pairs used"), round list with per-round winning pair.
- `app/round/[id]/page.tsx` (new): evolved copy of today's `app/season/[id]/page.tsx` — pair standings (extracted to `components/PairStandingsTable.tsx`), `SessionSummary`, `MatchListWithTabs`, complete/delete round, breadcrumbs.
- `app/season/[id]/page.tsx` → `redirect(/round/{id})` (old links keep working).

Components:
- **Extract** `StandingsTable.tsx` out of `LeagueTabs.tsx` (Phase 0, reused everywhere).
- **New**: `LeagueCard.tsx`, `CreateLeagueButton.tsx`, `CreateRoundButton.tsx` (absorbs the pairs-picker guts of `CreateWednesdaySeasonButton.tsx`), `PairStandingsTable.tsx`.
- **Generalize**: `MatchResultForm` (`scoringStyle` prop replaces `leagueType`), `MatchListWithTabs` (`scoringStyle` prop; drop `isAdhoc`), `SessionSummary` (**bug fix**: replace hand-rolled `games+1` scoring with `calculatePlayerPoints(style)` — currently wrong for every americano round).
- **Rename**: `CompleteSeasonButton`→`CompleteRoundButton`, `DeleteSeasonButton`→`DeleteRoundButton`.
- **Delete** (Phase 6): `LeagueTabs.tsx`, `CreateSeasonButton.tsx`, `CreateAdhocSeasonButton.tsx`, `CreateWednesdaySeasonButton.tsx`, `AddAdhocMatchButton.tsx`, `DeleteAdhocMatchButton.tsx`.
- `PairingsTable.tsx`, `lib/scoring.ts`, `lib/schedule-generator-pairs.ts`, `lib/suggest-pairs.ts` core: reused as-is (suggest-pairs gains the season constraint).

## Phases (each ends deployable)

- **Phase 0 — safety net (½ day)**: extract `StandingsTable`; characterization test locking the Wednesday all-time tally numbers against americano fixtures; fix `SessionSummary` americano scoring + `season/[id]` missing style arg (within the current leagueType world). Deploy as a bug-fix release.
- **Phase 1 — Prisma rename (½ day)**: `@@map`/`@map`, empty-diff gate, codemod. Zero behavior change.
- **Phase 2 — tables + registry (1 day)**: Migration B; `lib/formats.ts` + tests; `lib/season-grouping.ts` + tests.
- **Phase 3 — backfill (½ day + rehearsal)**: script, Neon-branch rehearsal with tally comparison, prod run (includes Sunday/adhoc deletion, after pg_dump).
- **Phase 4 — write path (1 day)**: new actions incl. season auto-complete and season-aware `suggestPairs`; dual-write `leagueType`; old UI shimmed onto new actions; re-run backfill post-deploy.
- **Phase 5 — new UI (2 days)**: `/`, league, season, round pages; redirect; component generalization; leagueType reads gone.
- **Phase 6 — cleanup (½ day)**: delete dead components/actions/legacy fallback; optionally register `americano-rotating` (wire `schedule-generator-8.ts`).

## Verification

- `npm test` green at every phase; existing `scoring.test.ts` untouched through Phase 4.
- New tests: season grouping (0/3/7/8/14/15 rounds; status rules), format registry sanity, season aggregation (= sum of round points, draw case), suggest-pairs season constraint + cycle completability.
- Backfill: `--dry-run` report reviewed; Neon-branch run; **all-time tally on the branch app must equal prod's Wednesday tab numbers exactly** before prod run.
- End-to-end after Phase 5: create league → create round (suggest pairs) → enter scores (incl. a 16-16 draw) → complete round ×7 → season auto-completes with champion → tally updates.

## Risks / rollback

- Sunday/adhoc deletion is irreversible → pg_dump + Neon branch first; deletion only in the backfill script, reviewed via `--dry-run`.
- Wrong Wednesday season grouping → only touches new nullable columns; fix pure function, re-run idempotent backfill.
- Any-phase rollback: revert code on Vercel; new tables/columns inert to old code; dual-written `leagueType` keeps old reads working (until Phase 6 deletes old UI).
