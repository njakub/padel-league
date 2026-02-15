import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateStandings } from "@/lib/scoring";
import CompleteSeasonButton from "@/components/CompleteSeasonButton";
import DeleteSeasonButton from "@/components/DeleteSeasonButton";
import MatchListWithTabs from "@/components/MatchListWithTabs";
import SessionSummary from "@/components/SessionSummary";

async function getSeason(id: number) {
  return await prisma.season.findUnique({
    where: { id },
    include: {
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

async function getAllPlayers() {
  return await prisma.player.findMany({
    orderBy: { id: "asc" },
  });
}

export default async function SeasonPage({
  params,
}: {
  params: { id: string };
}) {
  const seasonId = parseInt(params.id);
  if (isNaN(seasonId)) {
    notFound();
  }

  const [season, players] = await Promise.all([
    getSeason(seasonId),
    getAllPlayers(),
  ]);

  if (!season) {
    notFound();
  }

  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const standings = calculateStandings(season.matches, playerMap);

  const completedMatches = season.matches.filter((m) => m.winnerTeam !== null);
  const progress = {
    completed: completedMatches.length,
    total: season.totalMatches,
  };

  const canComplete =
    season.status === "ACTIVE" && progress.completed === progress.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{season.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span
              className={`px-2 py-1 rounded ${season.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
            >
              {season.status}
            </span>
            <span>
              {progress.completed} / {progress.total} matches completed
            </span>
          </div>
        </div>

        {canComplete && season.status === "ACTIVE" && (
          <CompleteSeasonButton seasonId={season.id} />
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{
              width: `${(progress.completed / progress.total) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Standings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Standings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Played
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  W-L
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Games For
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Games Against
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {standings.map((stat, index) => (
                <tr
                  key={stat.playerId}
                  className={index === 0 ? "bg-yellow-50" : ""}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                    {index === 0 && " 🏆"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.playerName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                    {stat.points}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                    {stat.matchesPlayed}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                    {stat.wins}-{stat.losses}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                    {stat.gamesFor}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                    {stat.gamesAgainst}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Summary - Today's games */}
      <SessionSummary matches={season.matches} seasonName={season.name} />

      {/* Schedule with Tabs */}
      <MatchListWithTabs
        matches={season.matches}
        seasonStatus={season.status}
      />

      {/* Delete Season - Bottom of page */}
      {season.status === "ACTIVE" && (
        <div className="pt-4 border-t border-gray-200">
          <details className="text-center">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 inline-block">
              Advanced Options
            </summary>
            <div className="mt-3">
              <DeleteSeasonButton
                seasonId={season.id}
                seasonName={season.name}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
