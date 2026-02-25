"use client";

import { useState, useMemo } from "react";

interface Match {
  id: number;
  matchNumber: number;
  teamAGames: number | null;
  teamBGames: number | null;
  winnerTeam: string | null;
  playedAt: Date | null;
  sitOutPlayer: { id: number; name: string } | null;
  teamAPlayer1: { id: number; name: string };
  teamAPlayer2: { id: number; name: string };
  teamBPlayer1: { id: number; name: string };
  teamBPlayer2: { id: number; name: string };
}

interface SessionSummaryProps {
  matches: Match[];
  seasonName: string;
}

interface PlayerSessionStats {
  playerId: number;
  name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  sitOuts: number;
}

interface PlayerComparison {
  playerId: number;
  name: string;
  sessionPoints: number;
  sessionRank: number;
  overallPoints: number;
  overallRank: number;
  pointsGained: number;
  rankChange: number;
}

export default function SessionSummary({
  matches,
  seasonName,
}: SessionSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Get today's date at midnight for comparison
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Filter matches played today
  const todayMatches = useMemo(() => {
    return matches.filter((match) => {
      if (!match.playedAt || !match.winnerTeam) return false;
      const matchDate = new Date(match.playedAt);
      matchDate.setHours(0, 0, 0, 0);
      return matchDate.getTime() === today.getTime();
    });
  }, [matches, today]);

  // Calculate session stats for each player
  const sessionStats = useMemo(() => {
    const statsMap = new Map<number, PlayerSessionStats>();

    // Initialize all players
    const allPlayers = new Set<{ id: number; name: string }>();
    todayMatches.forEach((match) => {
      allPlayers.add(match.teamAPlayer1);
      allPlayers.add(match.teamAPlayer2);
      allPlayers.add(match.teamBPlayer1);
      allPlayers.add(match.teamBPlayer2);
      if (match.sitOutPlayer) allPlayers.add(match.sitOutPlayer);
    });

    allPlayers.forEach((player) => {
      statsMap.set(player.id, {
        playerId: player.id,
        name: player.name,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
        sitOuts: 0,
      });
    });

    // Calculate stats from today's matches
    todayMatches.forEach((match) => {
      if (
        !match.winnerTeam ||
        match.teamAGames === null ||
        match.teamBGames === null
      )
        return;

      const teamAPlayers = [match.teamAPlayer1.id, match.teamAPlayer2.id];
      const teamBPlayers = [match.teamBPlayer1.id, match.teamBPlayer2.id];
      const teamAWon = match.winnerTeam === "A";

      // Update team A players
      teamAPlayers.forEach((playerId) => {
        const stats = statsMap.get(playerId)!;
        stats.matchesPlayed++;
        stats.gamesWon += match.teamAGames!;
        stats.gamesLost += match.teamBGames!;
        if (teamAWon) {
          stats.wins++;
          stats.points += match.teamAGames! + 1; // games + win bonus
        } else {
          stats.losses++;
          stats.points += match.teamAGames!; // games only
        }
      });

      // Update team B players
      teamBPlayers.forEach((playerId) => {
        const stats = statsMap.get(playerId)!;
        stats.matchesPlayed++;
        stats.gamesWon += match.teamBGames!;
        stats.gamesLost += match.teamAGames!;
        if (!teamAWon) {
          stats.wins++;
          stats.points += match.teamBGames! + 1; // games + win bonus
        } else {
          stats.losses++;
          stats.points += match.teamBGames!; // games only
        }
      });

      // Update sit-out count
      if (match.sitOutPlayer) {
        const sitOutStats = statsMap.get(match.sitOutPlayer.id)!;
        if (sitOutStats) sitOutStats.sitOuts++;
      }
    });

    // Convert to array and sort by points
    return Array.from(statsMap.values())
      .sort((a, b) => b.points - a.points)
      .map((stat, index) => ({ ...stat, sessionRank: index + 1 }));
  }, [todayMatches]);

  // Calculate overall season stats (all matches)
  const overallStats = useMemo(() => {
    const statsMap = new Map<
      number,
      { playerId: number; name: string; points: number }
    >();

    // Initialize all players from all matches
    const allPlayers = new Set<{ id: number; name: string }>();
    matches.forEach((match) => {
      allPlayers.add(match.teamAPlayer1);
      allPlayers.add(match.teamAPlayer2);
      allPlayers.add(match.teamBPlayer1);
      allPlayers.add(match.teamBPlayer2);
    });

    allPlayers.forEach((player) => {
      statsMap.set(player.id, {
        playerId: player.id,
        name: player.name,
        points: 0,
      });
    });

    // Calculate points from ALL matches
    matches.forEach((match) => {
      if (
        !match.winnerTeam ||
        match.teamAGames === null ||
        match.teamBGames === null
      )
        return;

      const teamAPlayers = [match.teamAPlayer1.id, match.teamAPlayer2.id];
      const teamBPlayers = [match.teamBPlayer1.id, match.teamBPlayer2.id];
      const teamAWon = match.winnerTeam === "A";

      teamAPlayers.forEach((playerId) => {
        const stats = statsMap.get(playerId)!;
        if (teamAWon) {
          stats.points += match.teamAGames! + 1;
        } else {
          stats.points += match.teamAGames!;
        }
      });

      teamBPlayers.forEach((playerId) => {
        const stats = statsMap.get(playerId)!;
        if (!teamAWon) {
          stats.points += match.teamBGames! + 1;
        } else {
          stats.points += match.teamBGames!;
        }
      });
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.points - a.points)
      .map((stat, index) => ({ ...stat, overallRank: index + 1 }));
  }, [matches]);

  // Calculate stats before today's session
  const beforeSessionStats = useMemo(() => {
    const statsMap = new Map<
      number,
      { playerId: number; name: string; points: number }
    >();

    // Get all players
    const allPlayers = new Set<{ id: number; name: string }>();
    matches.forEach((match) => {
      allPlayers.add(match.teamAPlayer1);
      allPlayers.add(match.teamAPlayer2);
      allPlayers.add(match.teamBPlayer1);
      allPlayers.add(match.teamBPlayer2);
    });

    allPlayers.forEach((player) => {
      statsMap.set(player.id, {
        playerId: player.id,
        name: player.name,
        points: 0,
      });
    });

    // Calculate points from matches NOT played today
    const beforeMatches = matches.filter((match) => {
      if (!match.playedAt) return false;
      const matchDate = new Date(match.playedAt);
      matchDate.setHours(0, 0, 0, 0);
      return matchDate.getTime() !== today.getTime();
    });

    beforeMatches.forEach((match) => {
      if (
        !match.winnerTeam ||
        match.teamAGames === null ||
        match.teamBGames === null
      )
        return;

      const teamAPlayers = [match.teamAPlayer1.id, match.teamAPlayer2.id];
      const teamBPlayers = [match.teamBPlayer1.id, match.teamBPlayer2.id];
      const teamAWon = match.winnerTeam === "A";

      teamAPlayers.forEach((playerId) => {
        const stats = statsMap.get(playerId)!;
        if (teamAWon) {
          stats.points += match.teamAGames! + 1;
        } else {
          stats.points += match.teamAGames!;
        }
      });

      teamBPlayers.forEach((playerId) => {
        const stats = statsMap.get(playerId)!;
        if (!teamAWon) {
          stats.points += match.teamBGames! + 1;
        } else {
          stats.points += match.teamBGames!;
        }
      });
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.points - a.points)
      .map((stat, index) => ({ ...stat, rankBefore: index + 1 }));
  }, [matches, today]);

  // Create comparison data
  const playerComparisons = useMemo(() => {
    const comparisons: PlayerComparison[] = [];

    sessionStats.forEach((sessionStat) => {
      const overallStat = overallStats.find(
        (s) => s.playerId === sessionStat.playerId,
      );
      const beforeStat = beforeSessionStats.find(
        (s) => s.playerId === sessionStat.playerId,
      );

      if (overallStat && beforeStat) {
        comparisons.push({
          playerId: sessionStat.playerId,
          name: sessionStat.name,
          sessionPoints: sessionStat.points,
          sessionRank: sessionStat.sessionRank || 0,
          overallPoints: overallStat.points,
          overallRank: overallStat.overallRank,
          pointsGained: overallStat.points - beforeStat.points,
          rankChange: beforeStat.rankBefore - overallStat.overallRank,
        });
      }
    });

    return comparisons.sort((a, b) => a.overallRank - b.overallRank);
  }, [sessionStats, overallStats, beforeSessionStats]);

  if (todayMatches.length === 0) {
    return null; // Don't show if no matches played today
  }

  return (
    <>
      {/* Button to open modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md flex items-center justify-center gap-2"
      >
        <span>📊 View Session Summary</span>
        <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
          {todayMatches.length} matches today
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  📊 Session Summary
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-3">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {todayMatches.length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Matches Played
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {todayMatches.reduce(
                      (sum, m) =>
                        sum + (m.teamAGames || 0) + (m.teamBGames || 0),
                      0,
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Total Games
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {sessionStats.filter((s) => s.matchesPlayed > 0).length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Players Active
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(
                      todayMatches.reduce(
                        (sum, m) =>
                          sum + (m.teamAGames || 0) + (m.teamBGames || 0),
                        0,
                      ) / todayMatches.length,
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Avg Games/Match
                  </div>
                </div>
              </div>

              {/* Movement & Comparison Table */}
              <div className="mb-3">
                <h3 className="text-base font-bold text-gray-900 mb-1.5">
                  Session Impact & Movement
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-1.5 py-1 text-left font-semibold text-gray-700 text-xs">
                          Player
                        </th>
                        <th className="px-1.5 py-1 text-center font-semibold text-gray-700 text-xs">
                          Session Pts
                        </th>
                        <th className="px-1.5 py-1 text-center font-semibold text-gray-700 text-xs">
                          Pts Gained
                        </th>
                        <th className="px-1.5 py-1 text-center font-semibold text-gray-700 text-xs">
                          Overall Pts
                        </th>
                        <th className="px-1.5 py-1 text-center font-semibold text-gray-700 text-xs">
                          Rank Change
                        </th>
                        <th className="px-1.5 py-1 text-center font-semibold text-gray-700 text-xs">
                          Overall Rank
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {playerComparisons.map((player) => (
                        <tr
                          key={player.playerId}
                          className={
                            player.overallRank === 1 ? "bg-yellow-50" : ""
                          }
                        >
                          <td className="px-1.5 py-1 font-medium text-gray-900">
                            {player.name}
                          </td>
                          <td className="px-1.5 py-1 text-center font-bold text-blue-600">
                            +{player.sessionPoints}
                          </td>
                          <td className="px-1.5 py-1 text-center">
                            <span className="text-green-600 font-semibold">
                              +{player.pointsGained}
                            </span>
                          </td>
                          <td className="px-1.5 py-1 text-center font-bold text-gray-900">
                            {player.overallPoints}
                          </td>
                          <td className="px-1.5 py-1 text-center">
                            {player.rankChange > 0 && (
                              <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                <span>↑{player.rankChange}</span>
                              </span>
                            )}
                            {player.rankChange < 0 && (
                              <span className="text-red-600 font-bold flex items-center justify-center gap-1">
                                <span>↓{Math.abs(player.rankChange)}</span>
                              </span>
                            )}
                            {player.rankChange === 0 && (
                              <span className="text-gray-400">−</span>
                            )}
                          </td>
                          <td className="px-1.5 py-1 text-center">
                            <span className="font-bold text-gray-900">
                              #{player.overallRank}
                              {player.overallRank === 1 && " 🏆"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Session Performance Bars */}
              <div className="mb-3">
                <h3 className="text-base font-bold text-gray-900 mb-1.5">
                  Session Performance
                </h3>
                <div className="space-y-1.5">
                  {sessionStats.map((stats) => {
                    const maxPoints = Math.max(
                      ...sessionStats.map((s) => s.points),
                    );
                    const percentage =
                      maxPoints > 0 ? (stats.points / maxPoints) * 100 : 0;

                    return (
                      <div key={stats.playerId}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">
                            {stats.name}
                          </span>
                          <span className="text-gray-600">
                            {stats.points} pts • {stats.wins}W-{stats.losses}L
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 Take a screenshot to share these results!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
