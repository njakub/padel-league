import { prisma } from "@/lib/prisma";
import {
  calculateStandings,
  calculatePlacementStandings,
} from "@/lib/scoring";
import { getFormat } from "@/lib/formats";
import LeagueCard, { type LeagueCardData } from "@/components/LeagueCard";
import CreateLeagueButton from "@/components/CreateLeagueButton";
import AddPlayerButton from "@/components/AddPlayerButton";

async function getLeagueCards(): Promise<LeagueCardData[]> {
  const [leagues, players] = await Promise.all([
    prisma.league.findMany({
      orderBy: { id: "asc" },
      include: {
        rounds: { include: { matches: true } },
        seasons: { orderBy: { number: "desc" } },
      },
    }),
    prisma.player.findMany({ orderBy: { id: "asc" } }),
  ]);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  return leagues.map((league) => {
    const format = getFormat(league.format);
    const activeRoundRow =
      league.rounds.find((r) => r.status === "ACTIVE") ?? null;
    const currentSeason = league.seasons[0] ?? null;
    const completedRoundsInSeason = currentSeason
      ? league.rounds.filter(
          (r) =>
            r.leagueSeasonId === currentSeason.id && r.status === "COMPLETED",
        ).length
      : 0;

    const completedRounds = league.rounds.filter(
      (r) => r.status === "COMPLETED",
    );
    const completedMatches = completedRounds.flatMap((r) => r.matches);
    const topTally = (
      format.seasonScoring === "placement"
        ? calculatePlacementStandings(
            completedRounds.map(
              (r) =>
                r.matches as Parameters<
                  typeof calculatePlacementStandings
                >[0][number],
            ),
            playerMap,
            format.scoringStyle,
          ).map((s) => ({
            playerId: s.playerId,
            playerName: s.playerName,
            points: s.placementPoints,
          }))
        : calculateStandings(
            completedMatches as Parameters<typeof calculateStandings>[0],
            playerMap,
            format.scoringStyle,
          )
            .filter((s) => s.matchesPlayed > 0)
            .map((s) => ({
              playerId: s.playerId,
              playerName: s.playerName,
              points: s.points,
            }))
    ).slice(0, 3);

    return {
      id: league.id,
      name: league.name,
      formatLabel: format.label,
      activeRound: activeRoundRow
        ? {
            id: activeRoundRow.id,
            name: activeRoundRow.name,
            completedCount: activeRoundRow.matches.filter(
              (m) => m.winnerTeam !== null,
            ).length,
            totalMatches: activeRoundRow.totalMatches,
          }
        : null,
      currentSeasonNumber: currentSeason?.number ?? null,
      seasonRoundsTarget: format.seasonRounds,
      completedRoundsInSeason,
      topTally,
    };
  });
}

export default async function HomePage() {
  const leagues = await getLeagueCards();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-900">Padel Leagues</h1>
        <div className="flex items-center gap-2">
          <AddPlayerButton />
          <CreateLeagueButton />
        </div>
      </div>

      {leagues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">
            No leagues yet — create one to start tracking matches.
          </p>
          <CreateLeagueButton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      )}
    </div>
  );
}
