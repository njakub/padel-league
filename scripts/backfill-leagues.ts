/**
 * One-time backfill for the League -> Season -> Round restructure.
 *
 * What it does:
 *   1. Upserts a single League ("wednesday", format "americano-pairs").
 *   2. Groups every WEDNESDAY round into LeagueSeasons of 7 (one full
 *      partner-cycle each) via the pure groupRoundsIntoSeasons() helper,
 *      and attaches leagueId/leagueSeasonId/roundNumber to each round.
 *   3. Deletes every SUNDAY and ADHOC round (cascades to their matches).
 *
 * Idempotent: every write is an upsert on a natural key (League.slug,
 * LeagueSeason[leagueId,number]) or a deterministic recompute-and-set
 * (round attachment), so it is safe to re-run at any time — including
 * after Phase 4 ships dual-write, to heal any rounds created in the gap.
 *
 * Usage:
 *   npx tsx scripts/backfill-leagues.ts --dry-run       # report only, no writes
 *   npx tsx scripts/backfill-leagues.ts --keep-legacy   # apply League/Season grouping only; leave Sunday/Adhoc rounds untouched (non-destructive)
 *   npx tsx scripts/backfill-leagues.ts                 # apply everything (destructive: deletes Sunday/Adhoc data)
 *
 * Before running without --keep-legacy: take a pg_dump backup and/or
 * rehearse against a Neon branch. This script does not ask for confirmation
 * itself.
 */

import { prisma } from "../lib/prisma";
import { groupRoundsIntoSeasons, type RoundLike } from "../lib/season-grouping";

const SEASON_ROUNDS = 7;
const LEAGUE_SLUG = "wednesday";
const LEAGUE_NAME = "Wednesday League";
const LEAGUE_FORMAT = "americano-pairs";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const keepLegacy = process.argv.includes("--keep-legacy");
  console.log(
    `Backfill: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}${keepLegacy ? " (--keep-legacy: Sunday/Adhoc rounds will NOT be deleted)" : ""}\n`,
  );

  // 1. Wednesday rounds -> League + grouped LeagueSeasons
  const wednesdayRounds = await prisma.round.findMany({
    where: { leagueType: "WEDNESDAY" },
    select: { id: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const groups = groupRoundsIntoSeasons(
    wednesdayRounds as RoundLike[],
    SEASON_ROUNDS,
  );

  console.log(
    `Found ${wednesdayRounds.length} WEDNESDAY round(s) -> ${groups.length} season(s):`,
  );
  for (const g of groups) {
    console.log(
      `  Season ${g.number}: ${g.rounds.length} round(s), status=${g.status}` +
        (g.completedAt ? `, completedAt=${g.completedAt.toISOString()}` : ""),
    );
  }

  // 2. Sunday + Adhoc rounds slated for deletion
  const toDelete = await prisma.round.findMany({
    where: { leagueType: { in: ["SUNDAY", "ADHOC"] } },
    select: { id: true, name: true, leagueType: true, _count: { select: { matches: true } } },
  });
  const matchesToDelete = toDelete.reduce((sum, r) => sum + r._count.matches, 0);
  console.log(
    `\n${keepLegacy ? "Would delete (skipped due to --keep-legacy)" : "Will delete"} ${toDelete.length} SUNDAY/ADHOC round(s) and their ${matchesToDelete} match(es):`,
  );
  for (const r of toDelete) {
    console.log(`  [${r.leagueType}] "${r.name}" (round ${r.id}, ${r._count.matches} matches)`);
  }

  const attachedIds = new Set(groups.flatMap((g) => g.rounds.map((r) => r.roundId)));
  const orphans = wednesdayRounds.filter((r) => !attachedIds.has(r.id));
  if (orphans.length > 0) {
    console.error(`\nERROR: ${orphans.length} WEDNESDAY round(s) not covered by grouping — aborting.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nDry run complete. No changes were made.");
    return;
  }

  // --- Live run below ---

  await prisma.$transaction(async (tx) => {
    const league = await tx.league.upsert({
      where: { slug: LEAGUE_SLUG },
      update: { name: LEAGUE_NAME, format: LEAGUE_FORMAT },
      create: { slug: LEAGUE_SLUG, name: LEAGUE_NAME, format: LEAGUE_FORMAT },
    });

    for (const g of groups) {
      const season = await tx.leagueSeason.upsert({
        where: { leagueId_number: { leagueId: league.id, number: g.number } },
        update: { status: g.status, completedAt: g.completedAt },
        create: {
          leagueId: league.id,
          number: g.number,
          status: g.status,
          completedAt: g.completedAt,
        },
      });

      for (const r of g.rounds) {
        await tx.round.update({
          where: { id: r.roundId },
          data: {
            leagueId: league.id,
            leagueSeasonId: season.id,
            roundNumber: r.roundNumber,
          },
        });
      }
    }

    if (!keepLegacy && toDelete.length > 0) {
      await tx.round.deleteMany({
        where: { id: { in: toDelete.map((r) => r.id) } },
      });
    }
  });

  console.log(
    keepLegacy
      ? "\nBackfill applied (League/Season grouping only — Sunday/Adhoc rounds left in place)."
      : "\nBackfill applied.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
