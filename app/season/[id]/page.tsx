import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateStandings, calculatePairingStats } from "@/lib/scoring";
import CompleteSeasonButton from "@/components/CompleteSeasonButton";
import DeleteSeasonButton from "@/components/DeleteSeasonButton";
import MatchListWithTabs from "@/components/MatchListWithTabs";
import SessionSummary from "@/components/SessionSummary";
import PairingsTable from "@/components/PairingsTable";
import AddAdhocMatchButton from "@/components/AddAdhocMatchButton";

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

  // For all league types, build the player map from everyone who appears in matches
  // (avoids hardcoded rosters) — unused players simply won't appear in standings
  const isWednesday = season.leagueType === "WEDNESDAY";
  const isAdhoc = season.leagueType === "ADHOC";
  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const standings = calculateStandings(
    season.matches as Parameters<typeof calculateStandings>[0],
    playerMap,
  );
  const pairingsFromStats = calculatePairingStats(
    season.matches as Parameters<typeof calculatePairingStats>[0],
    playerMap,
  );

  // For Americano, build the full set of 4 fixed pairs from the schedule so they
  // appear in the standings even before any scores are entered.
  const pairings = (() => {
    if (!isWednesday) return pairingsFromStats;
    const statsMap = new Map(
      pairingsFromStats.map((p) => [
        `${Math.min(p.player1Id, p.player2Id)}-${Math.max(p.player1Id, p.player2Id)}`,
        p,
      ]),
    );
    const seen = new Set<string>();
    const allPairs: typeof pairingsFromStats = [];
    for (const m of season.matches) {
      for (const [p1, p2] of [
        [m.teamAPlayer1, m.teamAPlayer2],
        [m.teamBPlayer1, m.teamBPlayer2],
      ] as [{ id: number; name: string }, { id: number; name: string }][]) {
        const key = `${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        allPairs.push(
          statsMap.get(key) ?? {
            player1Id: Math.min(p1.id, p2.id),
            player1Name: p1.id < p2.id ? p1.name : p2.name,
            player2Id: Math.max(p1.id, p2.id),
            player2Name: p1.id < p2.id ? p2.name : p1.name,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            gamesFor: 0,
            gamesAgainst: 0,
            winRate: 0,
          },
        );
      }
    }
    return allPairs;
  })();

  const completedMatches = season.matches.filter((m) => m.winnerTeam !== null);
  const progress = {
    completed: completedMatches.length,
    total: season.totalMatches ?? season.matches.length,
  };

  // Adhoc sessions can always be completed; others need all matches played
  const canComplete =
    season.status === "ACTIVE" &&
    (isAdhoc
      ? season.matches.length > 0
      : progress.completed === progress.total);

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
          <div className="flex gap-2 mt-2 text-sm text-gray-600 flex-wrap">
            <span
              className={`px-2 py-1 rounded ${
                isAdhoc
                  ? "bg-orange-100 text-orange-800"
                  : isWednesday
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {isAdhoc
                ? "🎲 Adhoc Session"
                : isWednesday
                  ? "🌙 Wednesday League"
                  : "☀️ Sunday League"}
            </span>
            <span
              className={`px-2 py-1 rounded ${season.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
            >
              {season.status}
            </span>
            <span>
              {isAdhoc
                ? `${progress.completed} of ${season.matches.length} matches played`
                : `${progress.completed} / ${progress.total} matches completed`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdhoc && season.status === "ACTIVE" && (
            <AddAdhocMatchButton
              seasonId={season.id}
              players={players.map((p) => ({ id: p.id, name: p.name }))}
            />
          )}
          {canComplete && season.status === "ACTIVE" && (
            <CompleteSeasonButton seasonId={season.id} />
          )}
        </div>
      </div>

      {/* Progress Bar — not shown for adhoc (no fixed total) */}
      {!isAdhoc && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.completed / progress.total) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      )}

      {/* Standings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {isWednesday ? "Pair Standings" : "Standings"}
        </h2>
        <div className="overflow-x-auto">
          {isWednesday ? (
            // Americano Pairs: rank pairs by total points scored (gamesFor)
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pair
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...pairings]
                  .sort((a, b) =>
                    b.gamesFor !== a.gamesFor
                      ? b.gamesFor - a.gamesFor
                      : b.wins - a.wins,
                  )
                  .map((pair, index) => (
                    <tr
                      key={`${pair.player1Id}-${pair.player2Id}`}
                      className={
                        index === 0 && pair.matchesPlayed > 0
                          ? "bg-yellow-50"
                          : ""
                      }
                    >
                      <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                        {index === 0 && pair.matchesPlayed > 0 && " 🏆"}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pair.player1Name} &amp; {pair.player2Name}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                        {pair.gamesFor}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                        {pair.matchesPlayed}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                        {pair.wins}-{pair.losses}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
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
                    Games For
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      {stat.gamesFor}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                      {stat.gamesAgainst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pairing Performance — Sunday/Adhoc only; Americano uses pair standings above */}
      {!isWednesday && pairings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Pairing Performance
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            How each duo has performed playing together this season
          </p>
          <PairingsTable pairings={pairings} title="" />
        </div>
      )}

      {/* Session Summary - Today's games */}
      <SessionSummary matches={season.matches} seasonName={season.name} />

      {/* Schedule with Tabs */}
      <MatchListWithTabs
        matches={season.matches}
        seasonStatus={season.status}
        isAdhoc={isAdhoc}
        leagueType={season.leagueType}
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
