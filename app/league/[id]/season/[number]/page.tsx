import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateStandings, calculatePairingStats } from "@/lib/scoring";
import { getFormat } from "@/lib/formats";
import StandingsTable from "@/components/StandingsTable";

async function getSeason(leagueId: number, number: number) {
  return prisma.leagueSeason.findUnique({
    where: { leagueId_number: { leagueId, number } },
    include: {
      league: true,
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: { matches: true },
      },
    },
  });
}

export default async function SeasonPage({
  params,
}: {
  params: { id: string; number: string };
}) {
  const leagueId = parseInt(params.id);
  const number = parseInt(params.number);
  if (isNaN(leagueId) || isNaN(number)) notFound();

  const [season, players] = await Promise.all([
    getSeason(leagueId, number),
    prisma.player.findMany({ orderBy: { id: "asc" } }),
  ]);
  if (!season) notFound();

  const format = getFormat(season.league.format);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const completedRounds = season.rounds.filter((r) => r.status === "COMPLETED");
  const seasonMatches = completedRounds.flatMap((r) => r.matches);
  const standings = calculateStandings(
    seasonMatches as Parameters<typeof calculateStandings>[0],
    playerMap,
    format.scoringStyle,
  ).filter((s) => s.matchesPlayed > 0);

  // Partner coverage: distinct pairs used across every round in the season
  // (a round's fixed pairs are committed as soon as it's created, regardless
  // of whether every match in it has been scored yet).
  const pairKey = (a: number, b: number) =>
    `${Math.min(a, b)}-${Math.max(a, b)}`;
  const usedPairs = new Set<string>();
  for (const round of season.rounds) {
    for (const m of round.matches) {
      usedPairs.add(pairKey(m.teamAPlayer1Id, m.teamAPlayer2Id));
      usedPairs.add(pairKey(m.teamBPlayer1Id, m.teamBPlayer2Id));
    }
  }
  const totalPossiblePairs =
    format.roster.kind === "pick-pairs"
      ? (format.roster.size * (format.roster.size - 1)) / 2
      : null;

  const champion = season.status === "COMPLETED" ? standings[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/league/${leagueId}`}
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to {season.league.name}
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-900">
            Season {season.number}
          </h1>
          <span
            className={`px-2 py-1 rounded text-sm ${
              season.status === "ACTIVE"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {season.status}
          </span>
          {champion && (
            <span className="text-sm font-semibold text-gray-900">
              🏆 {champion.playerName}
            </span>
          )}
        </div>
        {totalPossiblePairs !== null && (
          <p className="text-sm text-gray-600 mt-1">
            {usedPairs.size} of {totalPossiblePairs} pairs used
          </p>
        )}
      </div>

      {standings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Season Standings
          </h2>
          <StandingsTable standings={standings} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Rounds</h2>
        <div className="space-y-3">
          {season.rounds.map((round) => {
            const roundCompleted = round.status === "COMPLETED";
            const winningPair = roundCompleted
              ? calculatePairingStats(
                  round.matches as Parameters<typeof calculatePairingStats>[0],
                  playerMap,
                  format.scoringStyle,
                ).sort((a, b) =>
                  b.gamesFor !== a.gamesFor
                    ? b.gamesFor - a.gamesFor
                    : b.wins - a.wins,
                )[0]
              : null;

            return (
              <Link
                key={round.id}
                href={`/round/${round.id}`}
                className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {round.name}
                      {round.status === "ACTIVE" && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {round.matches.filter((m) => m.winnerTeam !== null).length}
                      {round.totalMatches ? ` / ${round.totalMatches}` : ""}{" "}
                      matches
                    </p>
                  </div>
                  {winningPair && (
                    <div className="text-sm font-medium text-gray-900">
                      🥇 {winningPair.player1Name} & {winningPair.player2Name}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
