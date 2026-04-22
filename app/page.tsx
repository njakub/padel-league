import { prisma } from "@/lib/prisma";
import { calculateStandings, calculatePairingStats } from "@/lib/scoring";
import LeagueTabs, {
  type LeagueData,
  type WednesdayLeagueData,
  type AdhocLeagueData,
  type ActiveSeasonInfo,
  type CompletedSeasonInfo,
} from "@/components/LeagueTabs";

const matchInclude = {
  matches: {
    include: {
      teamAPlayer1: true,
      teamAPlayer2: true,
      teamBPlayer1: true,
      teamBPlayer2: true,
      sitOutPlayer: true,
    },
    orderBy: { matchNumber: "asc" as const },
  },
};

async function buildSundayData(): Promise<LeagueData> {
  const [activeSeason, completedSeasons, players] = await Promise.all([
    prisma.season.findFirst({
      where: { status: "ACTIVE", leagueType: "SUNDAY" },
      include: matchInclude,
    }),
    prisma.season.findMany({
      where: { status: "COMPLETED", leagueType: "SUNDAY" },
      include: matchInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.player.findMany({ orderBy: { id: "asc" } }),
  ]);

  const leaguePlayers = players.filter((p) =>
    ["Jakub", "Joe", "Jon", "Matt", "Charlie"].includes(p.name),
  );
  const playerMap = new Map(leaguePlayers.map((p) => [p.id, p.name]));

  let activeSeasonInfo: ActiveSeasonInfo | null = null;
  if (activeSeason) {
    const standings = calculateStandings(
      activeSeason.matches as Parameters<typeof calculateStandings>[0],
      playerMap,
    );
    const pairings = calculatePairingStats(
      activeSeason.matches as Parameters<typeof calculatePairingStats>[0],
      playerMap,
    );
    const completedCount = activeSeason.matches.filter(
      (m) => m.winnerTeam !== null,
    ).length;
    activeSeasonInfo = {
      id: activeSeason.id,
      name: activeSeason.name,
      totalMatches: activeSeason.totalMatches,
      completedCount,
      standings,
      pairings,
    };
  }

  const completedSeasonsInfo: CompletedSeasonInfo[] = completedSeasons.map(
    (s) => ({
      id: s.id,
      name: s.name,
      totalMatches: s.totalMatches,
      createdAt: s.createdAt.toISOString(),
      completedCount: s.matches.filter((m) => m.winnerTeam !== null).length,
    }),
  );

  const allCompletedMatches = completedSeasons.flatMap((s) => s.matches);
  const leagueTally = calculateStandings(
    allCompletedMatches as Parameters<typeof calculateStandings>[0],
    playerMap,
  );
  const leaguePairings = calculatePairingStats(
    allCompletedMatches as Parameters<typeof calculatePairingStats>[0],
    playerMap,
  );

  return {
    activeSeason: activeSeasonInfo,
    completedSeasons: completedSeasonsInfo,
    leagueTally,
    leaguePairings,
  };
}

async function buildWednesdayData(): Promise<WednesdayLeagueData> {
  const [activeSeason, completedSeasons, allPlayers] = await Promise.all([
    prisma.season.findFirst({
      where: { status: "ACTIVE", leagueType: "WEDNESDAY" },
      include: matchInclude,
    }),
    prisma.season.findMany({
      where: { status: "COMPLETED", leagueType: "WEDNESDAY" },
      include: matchInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.player.findMany({ orderBy: { id: "asc" } }),
  ]);

  // Use all players as the map so any 8-player combination is supported
  const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]));

  let activeSeasonInfo: ActiveSeasonInfo | null = null;
  if (activeSeason) {
    const standings = calculateStandings(
      activeSeason.matches as Parameters<typeof calculateStandings>[0],
      playerMap,
      "americano",
    );
    const pairings = calculatePairingStats(
      activeSeason.matches as Parameters<typeof calculatePairingStats>[0],
      playerMap,
      "americano",
    );
    const completedCount = activeSeason.matches.filter(
      (m) => m.winnerTeam !== null,
    ).length;
    activeSeasonInfo = {
      id: activeSeason.id,
      name: activeSeason.name,
      totalMatches: activeSeason.totalMatches,
      completedCount,
      standings,
      pairings,
    };
  }

  const completedSeasonsInfo: CompletedSeasonInfo[] = completedSeasons.map(
    (s) => ({
      id: s.id,
      name: s.name,
      totalMatches: s.totalMatches,
      createdAt: s.createdAt.toISOString(),
      completedCount: s.matches.filter((m) => m.winnerTeam !== null).length,
    }),
  );

  const allCompletedMatches = completedSeasons.flatMap((s) => s.matches);
  const leagueTally = calculateStandings(
    allCompletedMatches as Parameters<typeof calculateStandings>[0],
    playerMap,
    "americano",
  );
  const leaguePairings = calculatePairingStats(
    allCompletedMatches as Parameters<typeof calculatePairingStats>[0],
    playerMap,
    "americano",
  );

  return {
    activeSeason: activeSeasonInfo,
    completedSeasons: completedSeasonsInfo,
    leagueTally,
    leaguePairings,
    allPlayers: allPlayers.map((p) => ({ id: p.id, name: p.name })),
  };
}

async function buildAdhocData(): Promise<AdhocLeagueData> {
  const [activeSeason, completedSeasons, allPlayers] = await Promise.all([
    prisma.season.findFirst({
      where: { status: "ACTIVE", leagueType: "ADHOC" },
      include: matchInclude,
    }),
    prisma.season.findMany({
      where: { status: "COMPLETED", leagueType: "ADHOC" },
      include: matchInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.player.findMany({ orderBy: { id: "asc" } }),
  ]);

  const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]));

  let activeSeasonInfo: ActiveSeasonInfo | null = null;
  if (activeSeason) {
    const standings = calculateStandings(
      activeSeason.matches as Parameters<typeof calculateStandings>[0],
      playerMap,
    );
    const pairings = calculatePairingStats(
      activeSeason.matches as Parameters<typeof calculatePairingStats>[0],
      playerMap,
    );
    const completedCount = activeSeason.matches.filter(
      (m) => m.winnerTeam !== null,
    ).length;
    activeSeasonInfo = {
      id: activeSeason.id,
      name: activeSeason.name,
      totalMatches: activeSeason.matches.length,
      completedCount,
      standings,
      pairings,
    };
  }

  const completedSeasonsInfo: CompletedSeasonInfo[] = completedSeasons.map(
    (s) => ({
      id: s.id,
      name: s.name,
      totalMatches: s.matches.length,
      createdAt: s.createdAt.toISOString(),
      completedCount: s.matches.filter((m) => m.winnerTeam !== null).length,
    }),
  );

  const allCompletedMatches = completedSeasons.flatMap((s) => s.matches);
  const leagueTally = calculateStandings(
    allCompletedMatches as Parameters<typeof calculateStandings>[0],
    playerMap,
  );
  const leaguePairings = calculatePairingStats(
    allCompletedMatches as Parameters<typeof calculatePairingStats>[0],
    playerMap,
  );

  return {
    activeSeason: activeSeasonInfo,
    completedSeasons: completedSeasonsInfo,
    leagueTally,
    leaguePairings,
    allPlayers: allPlayers.map((p) => ({ id: p.id, name: p.name })),
  };
}

export default async function HomePage() {
  const [sunday, wednesday, adhoc] = await Promise.all([
    buildSundayData(),
    buildWednesdayData(),
    buildAdhocData(),
  ]);

  return (
    <div>
      <LeagueTabs sunday={sunday} wednesday={wednesday} adhoc={adhoc} />
    </div>
  );
}
