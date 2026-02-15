import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateStandings } from "@/lib/scoring";
import CreateSeasonButton from "@/components/CreateSeasonButton";

async function getActiveSeason() {
  return await prisma.season.findFirst({
    where: { status: "ACTIVE" },
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

async function getCompletedSeasons() {
  return await prisma.season.findMany({
    where: { status: "COMPLETED" },
    include: {
      matches: {
        include: {
          teamAPlayer1: true,
          teamAPlayer2: true,
          teamBPlayer1: true,
          teamBPlayer2: true,
          sitOutPlayer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getAllPlayers() {
  return await prisma.player.findMany({
    orderBy: { id: "asc" },
  });
}

export default async function HomePage() {
  const [activeSeason, completedSeasons, players] = await Promise.all([
    getActiveSeason(),
    getCompletedSeasons(),
    getAllPlayers(),
  ]);

  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  // Calculate active season standings
  let activeStandings = null;
  let activeProgress = null;
  if (activeSeason) {
    activeStandings = calculateStandings(activeSeason.matches, playerMap);
    const completedMatches = activeSeason.matches.filter(
      (m) => m.winnerTeam !== null,
    );
    activeProgress = {
      completed: completedMatches.length,
      total: activeSeason.totalMatches,
    };
  }

  // Calculate overall league tally from completed seasons
  const allCompletedMatches = completedSeasons.flatMap((s) => s.matches);
  const leagueTally = calculateStandings(allCompletedMatches, playerMap);

  return (
    <div className="space-y-8">
      {/* Active Season Section */}
      {activeSeason ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeSeason.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {activeProgress?.completed} / {activeProgress?.total} matches
                completed
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-md">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((activeProgress?.completed || 0) / (activeProgress?.total || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <Link
              href={`/season/${activeSeason.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View Details
            </Link>
          </div>

          {/* Active Season Standings */}
          {activeStandings && activeStandings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Current Standings
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Played
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        W-L
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Games
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeStandings.map((stat, index) => (
                      <tr
                        key={stat.playerId}
                        className={index === 0 ? "bg-yellow-50" : ""}
                      >
                        <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                          {index === 0 && " 🏆"}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stat.playerName}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                          {stat.points}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                          {stat.matchesPlayed}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                          {stat.wins}-{stat.losses}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                          {stat.gamesFor}-{stat.gamesAgainst}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            No Active Season
          </h2>
          <p className="text-gray-600 mb-6">
            Create a new season to start tracking matches.
          </p>
          <CreateSeasonButton />
        </div>
      )}

      {/* Overall League Tally */}
      {completedSeasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Overall League Tally
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Statistics from {completedSeasons.length} completed season(s)
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Played
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    W-L
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leagueTally.map((stat, index) => (
                  <tr
                    key={stat.playerId}
                    className={index === 0 ? "bg-yellow-50" : ""}
                  >
                    <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                      {index === 0 && " 👑"}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.playerName}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                      {stat.points}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                      {stat.matchesPlayed}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                      {stat.wins}-{stat.losses}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                      {stat.gamesFor}-{stat.gamesAgainst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archived Seasons */}
      {completedSeasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Archived Seasons
          </h2>
          <div className="space-y-3">
            {completedSeasons.map((season) => {
              const completedMatches = season.matches.filter(
                (m) => m.winnerTeam !== null,
              ).length;
              return (
                <Link
                  key={season.id}
                  href={`/season/${season.id}`}
                  className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {season.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {completedMatches} / {season.totalMatches} matches •{" "}
                        {new Date(season.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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
