import { prisma } from "@/lib/prisma";
import { calculateStandings, calculatePairingStats } from "@/lib/scoring";
import LeagueTabs, {
  type LeagueData,
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

async function buildLeagueData(
  leagueType: "SUNDAY" | "WEDNESDAY",
): Promise<LeagueData> {
  const [activeSeason, completedSeasons, players] = await Promise.all([
    prisma.season.findFirst({
      where: { status: "ACTIVE", leagueType },
      include: matchInclude,
    }),
    prisma.season.findMany({
      where: { status: "COMPLETED", leagueType },
      include: matchInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.player.findMany({ orderBy: { id: "asc" } }),
  ]);

  // Build a player map scoped to this league's roster
  const leaguePlayers =
    leagueType === "SUNDAY"
      ? players.filter((p) =>
          ["Jakub", "Joe", "Jon", "Matt", "Charlie"].includes(p.name),
        )
      : players.filter((p) =>
          ["Jakub", "Joe", "Matt", "Charlie"].includes(p.name),
        );

  const playerMap = new Map(leaguePlayers.map((p) => [p.id, p.name]));

  // Active season
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

  // Completed seasons
  const completedSeasonsInfo: CompletedSeasonInfo[] = completedSeasons.map(
    (s) => ({
      id: s.id,
      name: s.name,
      totalMatches: s.totalMatches,
      createdAt: s.createdAt.toISOString(),
      completedCount: s.matches.filter((m) => m.winnerTeam !== null).length,
    }),
  );

  // Overall league tally across all completed seasons
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

export default async function HomePage() {
  const [sunday, wednesday] = await Promise.all([
    buildLeagueData("SUNDAY"),
    buildLeagueData("WEDNESDAY"),
  ]);

  return (
    <div>
      <LeagueTabs sunday={sunday} wednesday={wednesday} />
    </div>
  );
}
