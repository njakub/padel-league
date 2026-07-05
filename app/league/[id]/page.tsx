import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  calculateStandings,
  calculatePairingStats,
  calculatePlacementStandings,
} from "@/lib/scoring";
import { getFormat } from "@/lib/formats";
import StandingsTable from "@/components/StandingsTable";
import PlacementStandingsTable from "@/components/PlacementStandingsTable";
import PairingsTable from "@/components/PairingsTable";
import CreateRoundButton from "@/components/CreateRoundButton";
import CreateRoundPlayersButton from "@/components/CreateRoundPlayersButton";
import CompleteSeasonEarlyButton from "@/components/CompleteSeasonEarlyButton";

async function getLeague(id: number) {
  return prisma.league.findUnique({
    where: { id },
    include: {
      seasons: {
        orderBy: { number: "desc" },
        include: { rounds: { include: { matches: true } } },
      },
    },
  });
}

export default async function LeaguePage({
  params,
}: {
  params: { id: string };
}) {
  const leagueId = parseInt(params.id);
  if (isNaN(leagueId)) notFound();

  const [league, players] = await Promise.all([
    getLeague(leagueId),
    prisma.player.findMany({ orderBy: { id: "asc" } }),
  ]);
  if (!league) notFound();

  const format = getFormat(league.format);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const allRounds = league.seasons.flatMap((s) => s.rounds);
  const completedRounds = allRounds.filter((r) => r.status === "COMPLETED");
  const allTimeMatches = completedRounds.flatMap((r) => r.matches);

  const tally = calculateStandings(
    allTimeMatches as Parameters<typeof calculateStandings>[0],
    playerMap,
    format.scoringStyle,
  ).filter((s) => s.matchesPlayed > 0);
  const placementTally =
    format.seasonScoring === "placement"
      ? calculatePlacementStandings(
          completedRounds.map(
            (r) =>
              r.matches as Parameters<typeof calculatePlacementStandings>[0][number],
          ),
          playerMap,
          format.scoringStyle,
        )
      : null;
  const pairings = calculatePairingStats(
    allTimeMatches as Parameters<typeof calculatePairingStats>[0],
    playerMap,
    format.scoringStyle,
  );

  const activeRound = allRounds.find((r) => r.status === "ACTIVE") ?? null;
  const activeSeason = league.seasons.find((s) => s.status === "ACTIVE") ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Leagues
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{league.name}</h1>
          <p className="text-sm text-gray-600 mt-1">{format.label}</p>
        </div>
      </div>

      {/* Active round / season */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeRound && activeSeason ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Season {activeSeason.number}
                {format.seasonRounds !== null &&
                  ` — Round ${activeSeason.rounds.filter((r) => r.status === "COMPLETED").length} of ${format.seasonRounds}`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Active round: {activeRound.name} —{" "}
                {activeRound.matches.filter((m) => m.winnerTeam !== null).length}/
                {activeRound.totalMatches ?? "?"} matches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/round/${activeRound.id}`}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                View Round
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">No active round.</p>
            {format.roster.kind === "pick-pairs" ? (
              <CreateRoundButton
                leagueId={league.id}
                leagueName={league.name}
                roundLengths={format.roundLengths}
                players={players.map((p) => ({ id: p.id, name: p.name }))}
              />
            ) : (
              <CreateRoundPlayersButton
                leagueId={league.id}
                leagueName={league.name}
                roundLengths={format.roundLengths}
                rosterSize={format.roster.size}
                players={players.map((p) => ({ id: p.id, name: p.name }))}
              />
            )}
          </div>
        )}

        {activeSeason && (
          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">
              Advanced
            </summary>
            <div className="mt-2">
              <CompleteSeasonEarlyButton leagueSeasonId={activeSeason.id} />
            </div>
          </details>
        )}
      </div>

      {/* All-time tally */}
      {(placementTally ? placementTally.length : tally.length) > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            All-Time Tally
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Across {completedRounds.length} completed round(s)
            {placementTally &&
              ` — placement points (1st = ${format.roster.size} pts … last = 1, absent = 0)`}
          </p>
          {placementTally ? (
            <PlacementStandingsTable standings={placementTally} />
          ) : (
            <StandingsTable standings={tally} />
          )}
          {format.roundStandings === "pairs" && (
            <PairingsTable
              pairings={pairings}
              title="All-Time Pairing Performance"
              subtitle="Across all completed rounds"
            />
          )}
        </div>
      )}

      {/* Seasons list with champions */}
      {league.seasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Seasons</h2>
          <div className="space-y-3">
            {league.seasons.map((season) => {
              const seasonCompletedRounds = season.rounds.filter(
                (r) => r.status === "COMPLETED",
              );
              const seasonMatches = seasonCompletedRounds.flatMap(
                (r) => r.matches,
              );
              const champion =
                season.status === "COMPLETED"
                  ? format.seasonScoring === "placement"
                    ? calculatePlacementStandings(
                        seasonCompletedRounds.map(
                          (r) =>
                            r.matches as Parameters<
                              typeof calculatePlacementStandings
                            >[0][number],
                        ),
                        playerMap,
                        format.scoringStyle,
                      )[0]
                    : calculateStandings(
                        seasonMatches as Parameters<
                          typeof calculateStandings
                        >[0],
                        playerMap,
                        format.scoringStyle,
                      ).filter((s) => s.matchesPlayed > 0)[0]
                  : null;

              return (
                <Link
                  key={season.id}
                  href={`/league/${league.id}/season/${season.number}`}
                  className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Season {season.number}
                        {season.status === "ACTIVE" && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {seasonCompletedRounds.length}
                        {format.seasonRounds !== null
                          ? ` / ${format.seasonRounds}`
                          : ""}{" "}
                        rounds completed
                      </p>
                    </div>
                    {champion && (
                      <div className="text-sm font-semibold text-gray-900">
                        🏆 {champion.playerName}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
