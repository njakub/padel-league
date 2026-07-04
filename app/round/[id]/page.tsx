import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateStandings, calculatePairingStats } from "@/lib/scoring";
import { getFormat } from "@/lib/formats";
import CompleteRoundButton from "@/components/CompleteRoundButton";
import DeleteRoundButton from "@/components/DeleteRoundButton";
import MatchListWithTabs from "@/components/MatchListWithTabs";
import SessionSummary from "@/components/SessionSummary";
import StandingsTable from "@/components/StandingsTable";
import PairStandingsTable from "@/components/PairStandingsTable";

async function getRound(id: number) {
  return prisma.round.findUnique({
    where: { id },
    include: {
      league: true,
      leagueSeason: true,
      matches: {
        include: {
          teamAPlayer1: true,
          teamAPlayer2: true,
          teamBPlayer1: true,
          teamBPlayer2: true,
          sitOutPlayer: true,
        },
        orderBy: { matchNumber: "asc" },
      },
    },
  });
}

export default async function RoundPage({
  params,
}: {
  params: { id: string };
}) {
  const roundId = parseInt(params.id);
  if (isNaN(roundId)) notFound();

  const round = await getRound(roundId);
  // Rounds never attached to a League predate the restructure and have no
  // page in the new UI.
  if (!round || !round.league) notFound();

  const format = getFormat(round.league.format);
  const players = await prisma.player.findMany({ orderBy: { id: "asc" } });
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const pairings = calculatePairingStats(
    round.matches as Parameters<typeof calculatePairingStats>[0],
    playerMap,
    format.scoringStyle,
  );
  const standings = calculateStandings(
    round.matches as Parameters<typeof calculateStandings>[0],
    playerMap,
    format.scoringStyle,
  );

  const completedMatches = round.matches.filter((m) => m.winnerTeam !== null);
  const progress = {
    completed: completedMatches.length,
    total: round.totalMatches ?? round.matches.length,
  };
  const canComplete =
    round.status === "ACTIVE" && progress.completed === progress.total;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-2 flex-wrap">
            <Link href="/" className="hover:text-blue-800">
              Leagues
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              href={`/league/${round.league.id}`}
              className="hover:text-blue-800"
            >
              {round.league.name}
            </Link>
            {round.leagueSeason && (
              <>
                <span className="text-gray-400">/</span>
                <Link
                  href={`/league/${round.league.id}/season/${round.leagueSeason.number}`}
                  className="hover:text-blue-800"
                >
                  Season {round.leagueSeason.number}
                </Link>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{round.name}</h1>
          <div className="flex gap-2 mt-2 text-sm text-gray-600 flex-wrap">
            <span
              className={`px-2 py-1 rounded ${
                round.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {round.status}
            </span>
            <span>
              {progress.completed} / {progress.total} matches completed
            </span>
          </div>
        </div>

        {canComplete && (
          <CompleteRoundButton roundId={round.id} />
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-purple-600 h-3 rounded-full transition-all"
            style={{
              width:
                progress.total > 0
                  ? `${(progress.completed / progress.total) * 100}%`
                  : "0%",
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {format.roundStandings === "pairs" ? "Pair Standings" : "Standings"}
        </h2>
        {format.roundStandings === "pairs" ? (
          <PairStandingsTable pairings={pairings} />
        ) : (
          <StandingsTable standings={standings} />
        )}
      </div>

      <SessionSummary
        matches={round.matches}
        seasonName={round.name}
        scoringStyle={format.scoringStyle}
      />

      <MatchListWithTabs
        matches={round.matches}
        seasonStatus={round.status}
        scoringStyle={format.scoringStyle}
      />

      {round.status === "ACTIVE" && (
        <div className="pt-4 border-t border-gray-200">
          <details className="text-center">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 inline-block">
              Advanced Options
            </summary>
            <div className="mt-3">
              <DeleteRoundButton
                roundId={round.id}
                roundName={round.name}
                redirectTo={`/league/${round.league.id}`}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
