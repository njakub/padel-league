"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseMatchResult, ScoringStyle } from "@/lib/scoring";
import { suggestFixedPairs } from "@/lib/suggest-pairs";
import { FORMATS, getFormat, type FormatDescriptor } from "@/lib/formats";

/**
 * Record or update a match result
 */
export async function recordMatchResult(
  matchId: number,
  teamAGames: number,
  teamBGames: number,
) {
  try {
    // Fetch match with round to determine scoring style
    const matchWithSeason = await prisma.match.findUnique({
      where: { id: matchId },
      include: { round: { include: { league: true } } },
    });
    if (!matchWithSeason) {
      return { success: false, error: "Match not found." };
    }
    // Prefer the format registry once a round is linked to a League; fall
    // back to the legacy discriminator for rounds the backfill hasn't
    // reached yet (removed once Phase 6 retires leagueType reads).
    const style: ScoringStyle = matchWithSeason.round.league
      ? getFormat(matchWithSeason.round.league.format).scoringStyle
      : matchWithSeason.round.leagueType === "WEDNESDAY"
        ? "americano"
        : "standard";

    // Validate score
    const result = parseMatchResult(teamAGames, teamBGames, style);
    if (!result) {
      const hint =
        style === "americano"
          ? "Invalid score. Scores must total 32 (e.g. 20-12, 16-16)."
          : "Invalid score. One team must have exactly 4 games, the other 0-3.";
      return { success: false, error: hint };
    }

    // Update match
    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        teamAGames: result.teamAGames,
        teamBGames: result.teamBGames,
        winnerTeam: result.winnerTeam,
        playedAt: new Date(),
      },
      include: {
        round: true,
      },
    });

    revalidatePath("/");
    revalidatePath(`/season/${match.roundId}`);

    return { success: true };
  } catch (error) {
    console.error("Error recording match result:", error);
    return {
      success: false,
      error: "Failed to record result. Please try again.",
    };
  }
}

/**
 * Delete a match result (reset to unplayed)
 */
export async function deleteMatchResult(matchId: number) {
  try {
    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        teamAGames: null,
        teamBGames: null,
        winnerTeam: null,
        playedAt: null,
      },
      include: {
        round: true,
      },
    });

    revalidatePath("/");
    revalidatePath(`/season/${match.roundId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting match result:", error);
    return {
      success: false,
      error: "Failed to delete result. Please try again.",
    };
  }
}

/**
 * Suggest smart fixed pairs for a new Wednesday League season.
 *
 * Queries historical match data to:
 *   1. Avoid re-pairing players who have been partners before (primary goal)
 *   2. Balance strong players with weaker ones so every pair is competitive
 *
 * @param playerIds  Exactly 8 player IDs selected for the new season.
 */
export async function suggestWednesdayPairs(playerIds: number[]) {
  if (playerIds.length !== 8) {
    return {
      success: false as const,
      error: "Must provide exactly 8 player IDs.",
    };
  }

  try {
    // Resolve the (single, for now) League backing the Wednesday format so
    // history/exclusions can be scoped correctly once the backfill has run;
    // falls back to the legacy leagueType filter for rounds it hasn't reached.
    const wednesdayFormatIds = (Object.values(FORMATS) as FormatDescriptor[])
      .filter((f) => f.legacyLeagueType === "WEDNESDAY")
      .map((f) => f.id);
    const league = await prisma.league.findFirst({
      where: { format: { in: wednesdayFormatIds } },
    });
    const activeSeason = league
      ? await prisma.leagueSeason.findFirst({
          where: { leagueId: league.id, status: "ACTIVE" },
        })
      : null;

    // Fetch every WEDNESDAY match ever played (completed or not) for pairing history
    const allMatches = await prisma.match.findMany({
      where: league
        ? { round: { leagueId: league.id } }
        : { round: { leagueType: "WEDNESDAY" } },
      select: {
        teamAPlayer1Id: true,
        teamAPlayer2Id: true,
        teamBPlayer1Id: true,
        teamBPlayer2Id: true,
        teamAGames: true,
        teamBGames: true,
        round: { select: { leagueSeasonId: true } },
      },
    });

    // Build partnership-count map: how many matches each pair has played together
    const pairingHistory = new Map<string, number>();
    const pairKey = (a: number, b: number) =>
      `${Math.min(a, b)}-${Math.max(a, b)}`;

    // Pairs already used in the *current* season are hard-excluded so a
    // season always completes a full "everyone partners everyone" cycle
    // instead of repeating a pair early and blocking coverage later.
    const usedThisSeason = new Set<string>();

    for (const match of allMatches) {
      const keyA = pairKey(match.teamAPlayer1Id, match.teamAPlayer2Id);
      const keyB = pairKey(match.teamBPlayer1Id, match.teamBPlayer2Id);
      pairingHistory.set(keyA, (pairingHistory.get(keyA) ?? 0) + 1);
      pairingHistory.set(keyB, (pairingHistory.get(keyB) ?? 0) + 1);

      if (activeSeason && match.round.leagueSeasonId === activeSeason.id) {
        usedThisSeason.add(keyA);
        usedThisSeason.add(keyB);
      }
    }

    // Compute total americano points per selected player from completed matches
    const pointsMap = new Map<number, number>(playerIds.map((id) => [id, 0]));
    for (const match of allMatches) {
      if (match.teamAGames == null || match.teamBGames == null) continue;
      for (const pid of [match.teamAPlayer1Id, match.teamAPlayer2Id]) {
        if (pointsMap.has(pid))
          pointsMap.set(pid, pointsMap.get(pid)! + match.teamAGames);
      }
      for (const pid of [match.teamBPlayer1Id, match.teamBPlayer2Id]) {
        if (pointsMap.has(pid))
          pointsMap.set(pid, pointsMap.get(pid)! + match.teamBGames);
      }
    }

    // Convert points to rank positions (1 = highest scorer)
    const sortedByPoints = [...playerIds].sort(
      (a, b) => (pointsMap.get(b) ?? 0) - (pointsMap.get(a) ?? 0),
    );
    const rankMap = new Map<number, number>();
    sortedByPoints.forEach((pid, i) => rankMap.set(pid, i + 1));

    const pairs = suggestFixedPairs(
      playerIds,
      rankMap,
      pairingHistory,
      usedThisSeason,
    );
    return { success: true as const, pairs };
  } catch (error) {
    console.error("Error suggesting pairs:", error);
    return {
      success: false as const,
      error: "Failed to suggest pairs. Please try again.",
    };
  }
}

// ===== League / Season / Round (new domain model — see docs/restructure-plan.md) =====

/**
 * Create a new League for a given format.
 */
export async function createLeague(name: string, formatId: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "League name cannot be empty." };
  }

  try {
    const format = getFormat(formatId); // throws on unknown id

    const baseSlug =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "league";
    let slug = baseSlug;
    let suffix = 2;
    while (await prisma.league.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const league = await prisma.league.create({
      data: { slug, name: trimmed, format: format.id },
    });

    revalidatePath("/");
    return { success: true, leagueId: league.id };
  } catch (error) {
    console.error("Error creating league:", error);
    return {
      success: false,
      error: "Failed to create league. Please try again.",
    };
  }
}

/**
 * Create a new Round in a League: finds or opens the League's current
 * ACTIVE Season and appends the round to it, generating the schedule via
 * the League's format descriptor.
 */
export async function createRound(
  leagueId: number,
  totalMatches: number,
  pairs: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ],
  name?: string,
) {
  try {
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      return { success: false, error: "League not found." };
    }
    const format = getFormat(league.format);
    if (format.roster.kind !== "pick-pairs") {
      return {
        success: false,
        error: `Round creation for format "${format.id}" isn't supported yet.`,
      };
    }

    const allPlayerIds = pairs.flat();
    if (new Set(allPlayerIds).size !== format.roster.size) {
      return {
        success: false,
        error: `All ${format.roster.size} players across the pairs must be different.`,
      };
    }

    const existingActive = await prisma.round.findFirst({
      where: { leagueId, status: "ACTIVE" },
    });
    if (existingActive) {
      return {
        success: false,
        error:
          "There is already an active round for this league. Please complete it first.",
      };
    }

    const players = await prisma.player.findMany({
      where: { id: { in: allPlayerIds } },
    });
    if (players.length !== format.roster.size) {
      return {
        success: false,
        error: "One or more selected players could not be found.",
      };
    }

    // Find the league's current ACTIVE season, or open the next one.
    let season = await prisma.leagueSeason.findFirst({
      where: { leagueId, status: "ACTIVE" },
      include: { rounds: true },
    });
    if (!season) {
      const lastSeason = await prisma.leagueSeason.findFirst({
        where: { leagueId },
        orderBy: { number: "desc" },
      });
      season = await prisma.leagueSeason.create({
        data: { leagueId, number: (lastSeason?.number ?? 0) + 1, status: "ACTIVE" },
        include: { rounds: true },
      });
    }

    const roundNumber = season.rounds.length + 1;
    const matchesData = format.buildSchedule(totalMatches, { pairs });
    const roundName = name || `Round ${roundNumber}`;

    const round = await prisma.round.create({
      data: {
        name: roundName,
        totalMatches,
        status: "ACTIVE",
        leagueType: format.legacyLeagueType, // dual-write for rollback safety
        leagueId,
        leagueSeasonId: season.id,
        roundNumber,
        matches: {
          create: matchesData.map((m) => ({
            matchNumber: m.matchNumber,
            sitOutPlayerId: m.sitOutPlayerId ?? null,
            teamAPlayer1Id: m.teamAPlayer1Id,
            teamAPlayer2Id: m.teamAPlayer2Id,
            teamBPlayer1Id: m.teamBPlayer1Id,
            teamBPlayer2Id: m.teamBPlayer2Id,
          })),
        },
      },
    });

    revalidatePath("/");
    return { success: true, roundId: round.id };
  } catch (error) {
    console.error("Error creating round:", error);
    return {
      success: false,
      error: "Failed to create round. Please try again.",
    };
  }
}

/**
 * Complete a Round. If this was the season's last required round (per the
 * format's seasonRounds) and every round in the season is now COMPLETED,
 * the season auto-completes too.
 */
export async function completeRound(roundId: number) {
  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { matches: true, league: true },
    });
    if (!round) {
      return { success: false, error: "Round not found." };
    }

    const incomplete = round.matches.filter((m) => m.winnerTeam === null);
    if (incomplete.length > 0) {
      return {
        success: false,
        error: `Cannot complete round. ${incomplete.length} match(es) still need results.`,
      };
    }

    await prisma.round.update({
      where: { id: roundId },
      data: { status: "COMPLETED" },
    });

    if (round.leagueSeasonId && round.league) {
      const format = getFormat(round.league.format);
      if (format.seasonRounds !== null) {
        const seasonRounds = await prisma.round.findMany({
          where: { leagueSeasonId: round.leagueSeasonId },
          select: { status: true },
        });
        const seasonComplete =
          seasonRounds.length >= format.seasonRounds &&
          seasonRounds.every((r) => r.status === "COMPLETED");
        if (seasonComplete) {
          await prisma.leagueSeason.update({
            where: { id: round.leagueSeasonId },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
        }
      }
    }

    revalidatePath("/");
    revalidatePath(`/season/${roundId}`);
    return { success: true };
  } catch (error) {
    console.error("Error completing round:", error);
    return {
      success: false,
      error: "Failed to complete round. Please try again.",
    };
  }
}

/**
 * Manually end a season before it reaches a full partner cycle.
 */
export async function completeSeasonEarly(leagueSeasonId: number) {
  try {
    const season = await prisma.leagueSeason.findUnique({
      where: { id: leagueSeasonId },
    });
    if (!season) {
      return { success: false, error: "Season not found." };
    }
    if (season.status === "COMPLETED") {
      return { success: true };
    }

    await prisma.leagueSeason.update({
      where: { id: leagueSeasonId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error completing season early:", error);
    return {
      success: false,
      error: "Failed to complete season. Please try again.",
    };
  }
}

/**
 * Delete a Round. Only the most recent round in its league may be deleted,
 * matching the existing delete-latest-only UX. If this empties its season,
 * the season is deleted too.
 */
export async function deleteRound(roundId: number) {
  try {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) {
      return { success: false, error: "Round not found." };
    }

    if (round.leagueId) {
      const newer = await prisma.round.findFirst({
        where: {
          leagueId: round.leagueId,
          roundNumber: { gt: round.roundNumber ?? 0 },
        },
      });
      if (newer) {
        return {
          success: false,
          error: "Only the most recent round can be deleted.",
        };
      }
    }

    await prisma.round.delete({ where: { id: roundId } });

    if (round.leagueSeasonId) {
      const remaining = await prisma.round.count({
        where: { leagueSeasonId: round.leagueSeasonId },
      });
      if (remaining === 0) {
        await prisma.leagueSeason.delete({ where: { id: round.leagueSeasonId } });
      }
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting round:", error);
    return {
      success: false,
      error: "Failed to delete round. Please try again.",
    };
  }
}

/**
 * Add a new player to the system
 */
export async function createPlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Player name cannot be empty." };
  }

  try {
    await prisma.player.create({ data: { name: trimmed } });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    // Unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return { success: false, error: `"${trimmed}" already exists.` };
    }
    console.error("Error creating player:", error);
    return { success: false, error: "Failed to add player. Please try again." };
  }
}
