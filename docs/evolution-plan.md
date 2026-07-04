# Padel League — Product & Architecture Evolution Plan

## Context

The app is a working single-tenant Next.js 14 + Prisma + Postgres tracker for one friend group's padel: a 5-player Sunday league (sit-out rotation), an 8-player Wednesday Americano with fixed pairs, and adhoc sessions. It is live on Vercel with real data that must be preserved. The goal is to evolve it — no rewrite — into a multi-group product for casual amateur organisers, centred on **fair match generation, recurring groups, and lightweight competition**, deliberately not competing with Playtomic on booking.

Decisions confirmed with the user:
- **Multi-group + auth from the start** (first schema phase includes Group/User/Membership).
- Known broken areas: **season lifecycle / UI** and **schedule / pairings fairness**.
- **Visible Elo-style rating + ladder** as a first-class feature.

## Executive summary

The codebase is small (~4,800 LoC), which makes this a very tractable evolution. The core problems are: (1) `Season` is one god-entity with a `leagueType` string discriminator that leaks conditionals into every layer; (2) the Sunday roster is hardcoded by player name; (3) "season" conflates *competition* (a standings container) with *session* (one evening of play); (4) schedules are static precomputed lists with no notion of rounds, courts, attendance, or cross-session fairness — and the Sunday schedule has a real sequencing bug (3 consecutive sit-outs per player). The plan: stabilize and test first, extract a **format registry** to kill conditionals, evolve the schema **additively** (never rename/drop live tables — use Prisma `@@map`), introduce Group/Auth, then build a **history-aware scheduling engine** and session-based flow. Rating/ladder is computed data, rebuildable from matches, so it carries zero migration risk.

## Grounded codebase findings

Verified by reading the code (not assumptions):

1. **Hardcoded roster** — `["Jakub","Joe","Jon","Matt","Charlie"]` in `app/actions.ts:37` and `app/page.tsx:39`. Sunday league cannot exist for any other 5 people.
2. **`leagueType` conditionals everywhere** — `app/actions.ts`, `app/page.tsx` (3 near-identical `buildXData()` functions), `app/season/[id]/page.tsx`, `components/MatchListWithTabs.tsx`, `components/LeagueTabs.tsx` (487 lines). Adding a 4th format today means touching ~8 files.
3. **Flat `Match` model** — 5 player FKs + `matchNumber`; no round, court, date, or session. `sitOutPlayerId` only makes sense for the exactly-5 format.
4. **Sunday schedule sequencing bug (confirmed by running the generator)** — `generateBase15Matches()` produces sit-outs in blocks of 3 consecutive matches per player. At ~3 matches per Sunday, one player sits out an entire evening. Balanced in aggregate, unfair in sequence.
5. **Repetition blocks** — 30/45/60-match seasons repeat the base 15 in identical order; Wednesday repeats base 6 identically. Predictable and clumpy.
6. **Unused engine gold** — `lib/schedule-generator-8.ts` is a complete, script-verified Berger rotation for 8 players (every pair partners exactly once, opponents exactly twice) — **not wired into the app**. Same for `schedule-generator-4.ts`. The most-wanted feature ("we regularly play as 8, want fair rotations") is half-built.
7. **Latent scoring bug** — `app/season/[id]/page.tsx:60` computes standings without passing `"americano"` for Wednesday seasons (currently masked because that page renders pair standings from `gamesFor` instead). `calculatePairingStats` accepts a `style` param it never uses.
8. **No auth at all** — anyone with the URL can delete seasons. `deleteSeason` cascades matches.
9. **Migrations run at build time** — `build: prisma generate && prisma migrate deploy && next build`. Works, but couples deploy failure modes.
10. **Good, reusable assets** — `lib/scoring.ts` is clean and well-tested (440-line test file); `suggest-pairs.ts` has a correct 105-partition enumerator with history penalty + rank balancing; `SessionSummary.tsx` is already a screenshot-shareable summary. These survive into v2 largely intact.
11. **Tests cover only** scoring and the 5-player generator. Nothing covers standings-from-DB shapes, pairs generator, actions, or UI.

## Best product direction

**Own the niche: "the organiser's tool for a recurring padel group."** Playtomic owns venue booking and discovery; nobody owns the ongoing life of a friend group — who's in this week, fair teams from whoever shows up, a season narrative, banter-grade stats.

- **Persona**: the single organiser wrangling 5–10 regulars in a WhatsApp chat.
- **Value proposition**: *"Tell us who's in tonight; we generate the fairest possible games — and remember everything."* Fairness with memory across sessions is the moat; Playtomic's Americano tool is per-event and forgets.
- **Strongest use cases, ranked**: (1) recurring variable-attendance group nights (4–10 players, 1–2 courts); (2) 8-player Americano nights; (3) mini-leagues/seasons; (4) day tournaments (Mexicano/Americano); (5) ladders. Adhoc socials fold into (1).
- **Table stakes**: score entry, standings, match history, mobile-first UI, shareable results.
- **Differentiators**: cross-session fairness memory, attendance-aware generation with mid-session re-planning, visible group Elo ladder, pair-chemistry stats, balanced-team suggestions, WhatsApp-ready session summaries.

## Top 10 features, prioritized

1. **Smart Session generator** — pick tonight's attendees (any 4–10) + court count; engine generates fair rounds using all-time partner/opponent/sit-out history. Replaces manual adhoc entry. *(the core bet)*
2. **Rotating-partner Americano for 8** — wire up the existing `schedule-generator-8.ts`. Cheapest big win.
3. **Fix Sunday sequencing** — interleave sit-outs (no player sits twice before everyone sat once; no consecutive sit-outs). Fixes the confirmed fairness bug.
4. **Session attendance + dropout re-plan** — mark who's in; if someone leaves mid-session, lock played rounds and regenerate the rest.
5. **Visible Elo rating + ladder page** — per-group rating from match results, margin-weighted; ladder view with trend. Rebuildable from history, so it works retroactively on existing data.
6. **Balanced-team suggestions** — extend `suggest-pairs.ts` scoring to use Elo + chemistry instead of season rank only; show "why" (balance score, novelty).
7. **Format-flexible competitions** — create a competition from any roster + format + length (format registry below). Kills hardcoded Sunday/Wednesday split.
8. **Groups, magic-link auth, invite links** — multi-tenant; players claim their profile via invite; organiser role vs member role; RSVP availability for upcoming sessions.
9. **Shareable session summary** — upgrade `SessionSummary` to a public share link / OG image for the group chat.
10. **Day tournament mode (Mexicano)** — standings-driven round generation for a one-day event with live leaderboard.

## Recommended domain model (v2)

The central fix: **unbundle "Season" into Competition (standings container) and Session (one gathering)**, and make formats data, not code branches.

First-class entities (v2 names):

- **Group** — the friend circle/club. `slug`, invite code. Everything hangs off a group.
- **User** — auth identity (magic link). Linked to Player via optional `Player.userId`.
- **Player** — per-group profile (name, active flag, optional user link). Guests are just Players with no user. Existing 8 players map straight in.
- **Membership** — User↔Group with role (`ORGANISER` | `MEMBER`).
- **Competition** *(today's Season)* — a standings container: roster, format ref, config, status. Sunday Season → Competition(format: `box-league-5`), Wednesday → Competition(format: `americano-pairs`), Adhoc "season" → Competition(format: `open-play`) or a standalone Session.
- **Session** — one evening/day: date, court count, attendees, rounds. Optionally belongs to a Competition (league night) or standalone (social). *This is the currently-missing concept.*
- **SessionAttendee** — player + status (`IN`/`OUT`/`MAYBE`/`NO_SHOW`/`SUB`).
- **Round** — ordinal within a session; matches in a round are simultaneous; sit-outs are derivable (attendees not in any match of the round).
- **Match** — belongs to Competition and/or Session+Round; court number; two sides of 2 players; score. Keep the existing 4 player-FK columns (they're fine; a Side entity is over-modelling at this scale).
- **Format** (code, registry — not a table) + **config** (JSON column): scoring rules (`first-to-4 + win bonus` vs `points-to-32`), roster bounds, standings kind (individual vs pair), scheduler binding, score-entry kind.
- **PlayerRating / RatingEvent** — current Elo per player per group + per-match delta log. Fully derived; rebuildable by replay script.
- **Standings** — always computed from matches (as today; this part of the current design is right — keep it).

**Overloaded concepts resolved**: `Season` (was competition+session+adhoc-bucket) → Competition + Session. `leagueType` (was format+scoring+roster+UI hints) → format id + config. `sitOutPlayerId` (was format-specific column) → derived from round attendance (column retained for legacy reads until Phase 4).

**Separation of concerns**: *scheduling* (roster+history → rounds), *scoring* (raw score → validity+winner+points), *competition* (matches → standings/ladder) become three pure modules; format descriptors compose them.

## Recommended architecture

Keep the stack (Next 14 App Router, Prisma, Vercel, Vitest). Reorganize `lib/` into a domain layer that server actions call and components never bypass:

```
lib/
  domain/
    formats/registry.ts     // FormatDescriptor lookup by id
    formats/{box-league-5,americano-rotating,americano-pairs,open-play,mexicano}.ts
    scheduling/engine.ts    // general optimizer (cost-function based)
    scheduling/designs.ts   // exact combinatorial designs (existing generators move here)
    scheduling/history.ts   // build FairnessHistory from past matches
    scoring/rules.ts        // evolved lib/scoring.ts, driven by ScoringRules config
    standings.ts            // calculateStandings/PairingStats (mostly as-is)
    rating/elo.ts           // rating update + full replay/rebuild
  services/                 // use-cases: createCompetition, planSession, recordResult…
                            // plain async functions taking prisma — testable without Next
app/…                       // thin server actions + RSC pages calling services
components/…                // dumb; render from format metadata, no leagueType checks
```

Key contracts:

```ts
interface FormatDescriptor {
  id: string;                              // "americano-rotating" …
  name: string;
  roster: { min: number; max: number };
  scoring: ScoringRules;                   // {kind:"firstToGames",target:4,winBonus:1}
                                           // | {kind:"pointsTotal",total:32,allowDraw:true}
  standings: "individual" | "pair";
  scoreEntry: "games" | "points";
  planSession(input: SchedulerInput): Round[];
}
```

UI conditionals collapse into registry lookups (`format.standings === "pair"` replaces `leagueType === "WEDNESDAY"` etc.).

- **Compatibility adapter**: `getFormat(event)` returns `formatId ?? deriveFromLeagueType(leagueType)` so old rows work without backfill being a hard dependency.
- **Auth**: Auth.js (NextAuth v5) with the Prisma adapter + Resend email magic links — cheapest solid option on Vercel for a solo dev. Route protection via middleware; group access checked in services.
- **Deploys**: move `prisma migrate deploy` out of `next build` into a Vercel build command step that runs before build explicitly, and turn on Neon PITR/branching before any schema work (Neon branches double as free staging DBs for testing migrations against a copy of prod).
- **Feature flags**: a trivial env/`Group.settings` flag is enough (e.g. `NEW_SESSION_FLOW=1`); no flag service.

## Safe migration plan

Rules throughout: **additive migrations only**; never rename or drop a live table/column until the final cleanup phase; Prisma model renames use `@@map`/`@map` so physical names never change; every backfill is an idempotent script run against a Neon branch first; old read paths keep working until the new one is proven.

### Phase 1 — Stabilize (no schema changes)
- Enable Neon point-in-time recovery + take a manual dump. Precondition for everything.
- Fix confirmed bugs: Sunday sit-out clustering (interleave the 15-match design — pure function change, applies to *new* seasons only, zero data impact); americano style not passed on season detail page; the reported season-lifecycle/UI breakages (reproduce, list, fix — first concrete task of implementation).
- Add characterization tests: standings for both scoring styles against fixture data shaped like real DB rows; pairs generator balance; `suggest-pairs`. Lock current behaviour before refactoring.
- Add Sentry (or minimal error logging) so "some functionality is broken" becomes a bug list.

### Phase 2 — Domain extraction + schema wave 1 (identity & tenancy)
- Pure refactor first (no schema): introduce format registry + services layer; delete hardcoded roster (season creation UI gains a roster picker); move generators under `lib/domain/scheduling`.
- Migration A (additive): `Group`, `User`/auth tables, `Membership`; nullable `Player.groupId`, `Season.groupId`.
- Backfill A: create the one real Group; point all Players/Seasons at it. Then tighten to required in a follow-up migration.
- Ship magic-link auth + invite link. App keeps working identically for the existing group.

### Phase 3 — Schema wave 2 (formats, rounds, sessions) + engine
- Migration B (additive): `Season.formatId` (string, nullable), `Season.config` (Json), `Match.roundNumber`, `Match.courtNumber` (nullable). Rename Prisma models to `Competition` with `@@map("Season")` — physical table untouched.
- Backfill B: `formatId` from `leagueType`; rounds/courts from `matchNumber` (Sunday: round = matchNumber; Wednesday: round = ⌈matchNumber/2⌉, court = ((matchNumber−1) mod 2)+1).
- Migration C (additive): `Session`, `SessionAttendee`, `Round` (or just `Match.sessionId` + roundNumber if Round-as-table proves unnecessary — decide at implementation; start with columns, promote to table only if needed). Old competitions never get Sessions retroactively — dual-read: match lists group by session when present, by matchNumber otherwise.
- Build the scheduling engine + session flow behind a flag; run one real Wednesday on it before making it the default.

### Phase 4 — Product expansion + cleanup
- Ratings/ladder (new derived tables — zero risk), Mexicano day tournaments, RSVP, share links, onboarding for other groups.
- Only now: drop `leagueType` reads, make `formatId` required, retire dead columns (`sitOutPlayerId` stays until Sunday format reads sit-outs from rounds), delete legacy `buildXData` paths.

**Clean now vs later**: now — bugs, tests, hardcoded roster, format registry, dead generators wired in. Later — column drops, Round-as-entity, `sitOutPlayerId` removal, UI component decomposition beyond what the flow rework forces.

## Scheduling & fairness engine strategy

Two-layer design — exact math where it exists, optimizer everywhere else:

**Layer 1: exact designs** (already mostly written) for canonical cases: 5 players/1 court (the 15-match set, re-sequenced for sit-out spread), 8 players/2 courts rotating (K8 1-factorization — exists), 4 fixed pairs (K4 — exists), 4 players (exists). Registered per (playerCount, courts, format).

**Layer 2: general optimizer** for everything else (6, 7, 9, 10 players; uneven attendance; mid-session re-plan). Pure, seeded, deterministic:

```ts
planSession({ players, courts, roundCount, history, ratings, lockedRounds, weights }) → Round[]
```

- Cost function (weighted sum, weights per format/config): repeat-partner count (heavy), opponent-count variance, sit-out spread (max−min), consecutive sit-outs (very heavy), team rating imbalance |ΣeloA − ΣeloB|, court-assignment balance.
- Search: per-round candidate enumeration is tiny at this scale (8 players → 315 ways to fill 2 courts; 10 players → still thousands), so greedy round-by-round over enumerated candidates + a whole-session local-search pass (swap players between rounds) is exact-ish and runs in milliseconds. No need for anything fancier.
- **History-aware**: `FairnessHistory` (partner/opponent/sit-out counts) is built from *all past matches in the group*, not just the current session — this is the differentiator. Product surface: "Freshness" badges ("first time partnering in 14 sessions"), and a fairness report per generated plan ("everyone partners everyone at least once; sit-out spread ≤ 1").
- **Re-planning**: completed rounds pass in as `lockedRounds`; engine re-optimizes the remainder when attendance changes.
- **Testing**: property tests asserting fairness invariants (partner-count spread ≤ 1, no consecutive sit-outs, all exact designs match their verified properties) across seeds and player counts 4–10. This becomes the confidence layer the current code lacks.

**Rating (visible ladder)**: standard Elo, per group. Start 1200; team rating = mean; expected score vs actual (win/draw/loss), K=32 scaled by score margin. `RatingEvent` per match enables a full deterministic rebuild script (`recalculateRatings(groupId)`) — so ratings can be seeded retroactively from all existing data on day one, and any scoring fix just triggers a replay. Ladder page: rank, rating, trend sparkline, W-L, chemistry highlights.

## Biggest risks / anti-patterns to avoid

1. **Big-bang rename migration** — never rename/drop live tables; `@@map` + additive columns only.
2. **Over-generic rules engine** — a registry of ~6 concrete format descriptors beats a configurable-everything engine. New formats are new descriptor files.
3. **Building booking** — Playtomic's turf; a "court count" integer is all this product needs.
4. **Auth before value for the existing group** — sequence auth so the current users' flow never breaks mid-transition (Phase 2 keeps parity).
5. **Refactoring scheduling/scoring before tests exist** — characterization tests first (Phase 1), refactor second.
6. **Retro-fitting Sessions onto old data** — don't backfill sessions for historical seasons; dual-read instead.
7. **Elo drama** — visible ladder chosen deliberately, but keep standings the headline and rating margin-damped so one bad night doesn't crater someone.

## 6–8 week roadmap (solo, pragmatic)

- **Wk 1 — Stabilize**: Neon PITR + dump; reproduce & fix lifecycle/UI and schedule/pairing bugs; interleaved Sunday schedule; americano-style fix; characterization tests; Sentry.
- **Wk 2 — Extract domain**: format registry + services layer; kill hardcoded roster (roster picker); wire up `schedule-generator-8` as "Americano (rotating partners)" — first visible new feature.
- **Wk 3 — Tenancy**: Migration A (Group/User/Membership) + backfill; Auth.js magic links; invite link; role checks on destructive actions.
- **Wk 4 — Formats & rounds**: Migration B + backfill (formatId, config, round/court); competition creation UI driven by the registry; dual-read adapter.
- **Wk 5 — Engine + sessions**: general optimizer + fairness property tests; Migration C (Session/attendance); session flow: pick attendees → generate → enter scores per round → summary. Behind a flag; use it for one real night.
- **Wk 6 — Ratings**: Elo module + replay over full history; ladder page; balanced-team suggestions using Elo + chemistry.
- **Wk 7 — Social layer**: RSVP for upcoming sessions; shareable session summary link/OG image; onboarding polish for a second group (real-world test).
- **Wk 8 — Tournament + cleanup**: Mexicano day-tournament mode; remove flag; begin Phase 4 cleanup list.

## Verification

- **Phase 1**: full Vitest suite green including new characterization tests; run new Sunday generator through `scripts/verify-schedule.ts` plus new sequence assertions (no consecutive sit-outs, spread ≤ 1 at every prefix).
- **Migrations**: each backfill executed against a Neon branch of prod first; row-count and spot-check queries before/after; app smoke-tested against the branch (`DATABASE_URL` swap) before running on main.
- **Engine**: property tests across seeds/rosters 4–10; exact designs asserted against their documented invariants (the existing `scripts/verify-schedule-8*.ts` become tests).
- **End-to-end**: after each phase, run the real flows locally against branched prod data — create competition, generate session, enter scores, complete — and one real game night on the flagged session flow before default-on.
- **Ratings**: replay determinism test (two rebuilds → identical ratings); sanity-check ladder against the group's intuition of who's strongest.
