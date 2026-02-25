"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateSchedule, mapToPlayerIds } from "@/lib/schedule-generator";
import { generateSchedule4, mapToPlayerIds4 } from "@/lib/schedule-generator-4";
import { parseMatchResult } from "@/lib/scoring";

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
    // Validate score
    const result = parseMatchResult(teamAGames, teamBGames);
    if (!result) {
      return {
        success: false,
        error:
          "Invalid score. One team must have exactly 4 games, the other 0-3.",
      };
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

    const incompletMatches = season.matches.filter(
      (m) => m.winnerTeam === null,
    );
    if (incompletMatches.length > 0) {
      return {
        success: false,
        error: `Cannot complete season. ${incompletMatches.length} match(es) still need results.`,
      };
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
 * Create a new Wednesday League season (4 players: Jakub, Joe, Matt, Charlie)
 */
export async function createWednesdaySeason(
  totalMatches: 12 | 24 | 36,
  name?: string,
) {
  try {
    // Check if there's already an active Wednesday season
    const existingActive = await prisma.season.findFirst({
      where: { status: "ACTIVE", leagueType: "WEDNESDAY" },
    });

    if (existingActive) {
      return {
        success: false,
        error:
          "There is already an active Wednesday League season. Please complete it first.",
      };
    }

    // Get Wednesday League players (Jakub, Joe, Matt, Charlie — no Jon)
    const players = await prisma.player.findMany({
      where: { name: { in: ["Jakub", "Joe", "Matt", "Charlie"] } },
      orderBy: { id: "asc" },
    });

    if (players.length !== 4) {
      return {
        success: false,
        error:
          "System requires exactly 4 Wednesday League players to be configured.",
      };
    }

    // Generate schedule
    const schedule = generateSchedule4(totalMatches);
    const playerIds = players.map((p) => p.id);
    const matchesData = mapToPlayerIds4(schedule, playerIds);

    // Count existing Wednesday seasons to generate default name
    const seasonCount = await prisma.season.count({
      where: { leagueType: "WEDNESDAY" },
    });
    const seasonName = name || `Wednesday Season ${seasonCount + 1}`;

    // Create season with matches (no sitOutPlayerId for 4-player format)
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
      error: "Failed to create Wednesday League season. Please try again.",
    };
  }
}
