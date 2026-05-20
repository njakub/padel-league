"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateSchedule, mapToPlayerIds } from "@/lib/schedule-generator";
import {
  generateSchedulePairs,
  mapToPlayerIdsPairs,
} from "@/lib/schedule-generator-pairs";
import { parseMatchResult, ScoringStyle } from "@/lib/scoring";
import { suggestFixedPairs } from "@/lib/suggest-pairs";

/**
 * Create a new season with generated schedule
 */
export async function createSeason(
  totalMatches: 15 | 30 | 45 | 60,
  name?: string,
) {
  try {
    // Check if there's already an active Sunday season
    const existingActive = await prisma.season.findFirst({
      where: { status: "ACTIVE", leagueType: "SUNDAY" },
    });

    if (existingActive) {
      return {
        success: false,
        error:
          "There is already an active Sunday League season. Please complete it first.",
      };
    }

    // Get Sunday League players (Jakub, Joe, Jon, Matt, Charlie — all 5)
    const players = await prisma.player.findMany({
      where: { name: { in: ["Jakub", "Joe", "Jon", "Matt", "Charlie"] } },
      orderBy: { id: "asc" },
    });

    if (players.length !== 5) {
      return {
        success: false,
        error:
          "System requires exactly 5 Sunday League players to be configured.",
      };
    }

    // Generate schedule
    const schedule = generateSchedule(totalMatches);
    const playerIds = players.map((p) => p.id);
    const matchesData = mapToPlayerIds(schedule, playerIds);

    // Count existing Sunday seasons to generate default name
    const seasonCount = await prisma.season.count({
      where: { leagueType: "SUNDAY" },
    });
    const seasonName = name || `Season ${seasonCount + 1}`;

    // Create season with matches
    const season = await prisma.season.create({
      data: {
        name: seasonName,
        totalMatches,
        status: "ACTIVE",
        leagueType: "SUNDAY",
        matches: {
          create: matchesData.map((match) => ({
            matchNumber: match.matchNumber,
            sitOutPlayerId: match.sitOutPlayerId,
            teamAPlayer1Id: match.teamAPlayer1Id,
            teamAPlayer2Id: match.teamAPlayer2Id,
            teamBPlayer1Id: match.teamBPlayer1Id,
            teamBPlayer2Id: match.teamBPlayer2Id,
          })),
        },
      },
    });

    revalidatePath("/");
    return { success: true, seasonId: season.id };
  } catch (error) {
    console.error("Error creating season:", error);
    return {
      success: false,
      error: "Failed to create season. Please try again.",
    };
  }
}

/**
 * Record or update a match result
 */
export async function recordMatchResult(
  matchId: number,
  teamAGames: number,
  teamBGames: number,
) {
  try {
    // Fetch match with season to determine scoring style
    const matchWithSeason = await prisma.match.findUnique({
      where: { id: matchId },
      include: { season: true },
    });
    if (!matchWithSeason) {
      return { success: false, error: "Match not found." };
    }
    const style: ScoringStyle =
      matchWithSeason.season.leagueType === "WEDNESDAY"
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
        season: true,
      },
    });

    revalidatePath("/");
    revalidatePath(`/season/${match.seasonId}`);

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
 * Complete a season (mark as COMPLETED)
 */
export async function completeSeason(seasonId: number) {
  try {
    // Check if all matches have results
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        matches: true,
      },
    });

    if (!season) {
      return { success: false, error: "Season not found." };
    }

    // ADHOC seasons can be completed at any time (no fixed schedule)
    if (season.leagueType !== "ADHOC") {
      const incompletMatches = season.matches.filter(
        (m) => m.winnerTeam === null,
      );
      if (incompletMatches.length > 0) {
        return {
          success: false,
          error: `Cannot complete season. ${incompletMatches.length} match(es) still need results.`,
        };
      }
    }

    await prisma.season.update({
      where: { id: seasonId },
      data: { status: "COMPLETED" },
    });

    revalidatePath("/");
    revalidatePath(`/season/${seasonId}`);

    return { success: true };
  } catch (error) {
    console.error("Error completing season:", error);
    return {
      success: false,
      error: "Failed to complete season. Please try again.",
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
        season: true,
      },
    });

    revalidatePath("/");
    revalidatePath(`/season/${match.seasonId}`);

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
 * Delete a season (and all its matches)
 */
export async function deleteSeason(seasonId: number) {
  try {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        matches: true,
      },
    });

    if (!season) {
      return { success: false, error: "Season not found." };
    }

    // Delete the season (matches will be cascade deleted)
    await prisma.season.delete({
      where: { id: seasonId },
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting season:", error);
    return {
      success: false,
      error: "Failed to delete season. Please try again.",
    };
  }
}

/**
 * Create a new Wednesday League season (8 players, 2 courts, no sit-outs)
 */
export async function createWednesdaySeason(
  totalMatches: 6 | 12 | 18 | 24,
  // 4 fixed pairs: each pair is [player1Id, player2Id]
  pairs: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ],
  name?: string,
) {
  const allPlayerIds = pairs.flat();
  if (new Set(allPlayerIds).size !== 8) {
    return {
      success: false,
      error: "All 8 players across the 4 pairs must be different.",
    };
  }

  try {
    // Verify all players exist
    const players = await prisma.player.findMany({
      where: { id: { in: allPlayerIds } },
    });

    if (players.length !== 8) {
      return {
        success: false,
        error: "One or more selected players could not be found.",
      };
    }

    // Generate schedule with fixed pairs
    const schedule = generateSchedulePairs(totalMatches);
    const matchesData = mapToPlayerIdsPairs(schedule, pairs);

    // Count existing Wednesday seasons to generate default name
    const seasonCount = await prisma.season.count({
      where: { leagueType: "WEDNESDAY" },
    });
    const seasonName = name || `Americano Season ${seasonCount + 1}`;

    // Create season with matches (no sitOutPlayerId — no one sits out)
    const season = await prisma.season.create({
      data: {
        name: seasonName,
        totalMatches,
        status: "ACTIVE",
        leagueType: "WEDNESDAY",
        matches: {
          create: matchesData.map((match) => ({
            matchNumber: match.matchNumber,
            teamAPlayer1Id: match.teamAPlayer1Id,
            teamAPlayer2Id: match.teamAPlayer2Id,
            teamBPlayer1Id: match.teamBPlayer1Id,
            teamBPlayer2Id: match.teamBPlayer2Id,
          })),
        },
      },
    });

    revalidatePath("/");
    return { success: true, seasonId: season.id };
  } catch (error) {
    console.error("Error creating Wednesday season:", error);
    return {
      success: false,
      error: "Failed to create Americano Pairs season. Please try again.",
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
    // Fetch every WEDNESDAY match ever played (completed or not) for pairing history
    const allMatches = await prisma.match.findMany({
      where: { season: { leagueType: "WEDNESDAY" } },
      select: {
        teamAPlayer1Id: true,
        teamAPlayer2Id: true,
        teamBPlayer1Id: true,
        teamBPlayer2Id: true,
        teamAGames: true,
        teamBGames: true,
      },
    });

    // Build partnership-count map: how many matches each pair has played together
    const pairingHistory = new Map<string, number>();
    const pairKey = (a: number, b: number) =>
      `${Math.min(a, b)}-${Math.max(a, b)}`;

    for (const match of allMatches) {
      const keyA = pairKey(match.teamAPlayer1Id, match.teamAPlayer2Id);
      const keyB = pairKey(match.teamBPlayer1Id, match.teamBPlayer2Id);
      pairingHistory.set(keyA, (pairingHistory.get(keyA) ?? 0) + 1);
      pairingHistory.set(keyB, (pairingHistory.get(keyB) ?? 0) + 1);
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

    const pairs = suggestFixedPairs(playerIds, rankMap, pairingHistory);
    return { success: true as const, pairs };
  } catch (error) {
    console.error("Error suggesting pairs:", error);
    return {
      success: false as const,
      error: "Failed to suggest pairs. Please try again.",
    };
  }
}

/**
 * Create a new Adhoc League session (no fixed schedule or player roster)
 */
export async function createAdhocSeason(name?: string) {
  try {
    const existingActive = await prisma.season.findFirst({
      where: { status: "ACTIVE", leagueType: "ADHOC" },
    });

    if (existingActive) {
      return {
        success: false,
        error:
          "There is already an active Adhoc League session. Please complete it first.",
      };
    }

    const seasonCount = await prisma.season.count({
      where: { leagueType: "ADHOC" },
    });
    const seasonName = name || `Adhoc Session ${seasonCount + 1}`;

    const season = await prisma.season.create({
      data: {
        name: seasonName,
        totalMatches: null,
        status: "ACTIVE",
        leagueType: "ADHOC",
      },
    });

    revalidatePath("/");
    return { success: true, seasonId: season.id };
  } catch (error) {
    console.error("Error creating adhoc season:", error);
    return {
      success: false,
      error: "Failed to create Adhoc session. Please try again.",
    };
  }
}

/**
 * Add a match to an Adhoc League session with manually chosen players
 */
export async function addAdhocMatch(
  seasonId: number,
  teamAPlayer1Id: number,
  teamAPlayer2Id: number,
  teamBPlayer1Id: number,
  teamBPlayer2Id: number,
) {
  try {
    const playerIds = [
      teamAPlayer1Id,
      teamAPlayer2Id,
      teamBPlayer1Id,
      teamBPlayer2Id,
    ];
    if (new Set(playerIds).size !== 4) {
      return { success: false, error: "All 4 players must be different." };
    }

    const lastMatch = await prisma.match.findFirst({
      where: { seasonId },
      orderBy: { matchNumber: "desc" },
    });
    const matchNumber = (lastMatch?.matchNumber ?? 0) + 1;

    await prisma.match.create({
      data: {
        seasonId,
        matchNumber,
        teamAPlayer1Id,
        teamAPlayer2Id,
        teamBPlayer1Id,
        teamBPlayer2Id,
      },
    });

    revalidatePath("/");
    revalidatePath(`/season/${seasonId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding adhoc match:", error);
    return {
      success: false,
      error: "Failed to add match. Please try again.",
    };
  }
}

/**
 * Delete an adhoc match entirely (including any recorded result)
 */
export async function deleteAdhocMatch(matchId: number) {
  try {
    const match = await prisma.match.delete({
      where: { id: matchId },
    });

    revalidatePath("/");
    revalidatePath(`/season/${match.seasonId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting adhoc match:", error);
    return {
      success: false,
      error: "Failed to delete match. Please try again.",
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
