"use client";

import { useState, useMemo } from "react";
import MatchResultForm from "./MatchResultForm";
import DeleteAdhocMatchButton from "./DeleteAdhocMatchButton";

interface Match {
  id: number;
  matchNumber: number;
  teamAGames: number | null;
  teamBGames: number | null;
  winnerTeam: string | null;
  sitOutPlayer: { name: string } | null;
  teamAPlayer1: { name: string };
  teamAPlayer2: { name: string };
  teamBPlayer1: { name: string };
  teamBPlayer2: { name: string };
}

interface MatchListWithTabsProps {
  matches: Match[];
  seasonStatus: string;
  isAdhoc?: boolean;
}

export default function MatchListWithTabs({
  matches,
  seasonStatus,
  isAdhoc = false,
}: MatchListWithTabsProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending",
  );
  const [sitOutFilter, setSitOutFilter] = useState<string>("all");

  // Whether this is a 5-player format (has sit-out) or 4-player (no sit-out)
  const hasSitOut = matches.some((m) => m.sitOutPlayer !== null);

  const pendingMatches = matches.filter((m) => m.winnerTeam === null);
  const completedMatches = matches.filter((m) => m.winnerTeam !== null);

  // Find the last completed match (highest match number with a result)
  const lastCompletedMatch = useMemo(() => {
    return completedMatches.length > 0
      ? completedMatches.reduce((latest, current) =>
          current.matchNumber > latest.matchNumber ? current : latest,
        )
      : null;
  }, [completedMatches]);

  // Get unique sit-out players and their counts (5-player format only)
  const sitOutStats = useMemo(() => {
    if (!hasSitOut) return [];
    const stats = new Map<
      string,
      { pending: number; completed: number; total: number }
    >();

    matches.forEach((match) => {
      if (!match.sitOutPlayer) return;
      const name = match.sitOutPlayer.name;
      if (!stats.has(name)) {
        stats.set(name, { pending: 0, completed: 0, total: 0 });
      }
      const stat = stats.get(name)!;
      stat.total++;
      if (match.winnerTeam === null) {
        stat.pending++;
      } else {
        stat.completed++;
      }
    });

    return Array.from(stats.entries())
      .map(([name, counts]) => ({
        name,
        ...counts,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, hasSitOut]);

  // Calculate recommended next to sit out (player with fewest completed sit-outs)
  const recommendedNextSitOut = useMemo(() => {
    if (sitOutStats.length === 0) return null;

    // Find the minimum completed count
    const minCompleted = Math.min(...sitOutStats.map((s) => s.completed));

    // Get all players with the minimum count
    const candidates = sitOutStats.filter((s) => s.completed === minCompleted);

    // If there's a tie, exclude the last person who sat out
    if (candidates.length > 1 && lastCompletedMatch) {
      const filtered = candidates.filter(
        (c) => c.name !== lastCompletedMatch.sitOutPlayer?.name,
      );
      // If filtering leaves us with candidates, use those; otherwise use all candidates
      return filtered.length > 0 ? filtered : candidates;
    }

    return candidates;
  }, [sitOutStats, lastCompletedMatch]);

  const baseMatches =
    activeTab === "pending" ? pendingMatches : completedMatches;

  const displayMatches =
    sitOutFilter === "all"
      ? baseMatches
      : baseMatches.filter((m) => m.sitOutPlayer?.name === sitOutFilter);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Schedule & Results
      </h2>

      {/* Sit-out sections — 5-player format only */}
      {hasSitOut && (
        <>
          {/* Last Sit-out Indicator */}
          {lastCompletedMatch && lastCompletedMatch.sitOutPlayer && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-900">
                <span className="font-semibold">Last to sit out:</span>{" "}
                {lastCompletedMatch.sitOutPlayer.name} (Match{" "}
                {lastCompletedMatch.matchNumber})
              </div>
            </div>
          )}

          {/* Recommended Next to Sit Out */}
          {recommendedNextSitOut && recommendedNextSitOut.length > 0 && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-900">
                <span className="font-semibold">
                  Recommended next to sit out:
                </span>{" "}
                {recommendedNextSitOut.map((p) => p.name).join(" or ")}
                {recommendedNextSitOut.length === 1 && (
                  <span className="text-green-700">
                    {" "}
                    ({recommendedNextSitOut[0].completed} completed)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sit-out Balance Stats */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Sit-out Distribution
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sitOutStats.map((stat) => {
                const isLastSitOut =
                  lastCompletedMatch?.sitOutPlayer?.name === stat.name;
                const isRecommended =
                  recommendedNextSitOut?.some((r) => r.name === stat.name) ||
                  false;

                return (
                  <div
                    key={stat.name}
                    className={`text-center p-1 rounded ${
                      isLastSitOut
                        ? "bg-blue-100 border border-blue-300"
                        : isRecommended
                          ? "bg-green-100 border border-green-300"
                          : ""
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-900">
                      {stat.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {stat.completed}/{stat.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "pending"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Pending ({pendingMatches.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "completed"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Completed ({completedMatches.length})
        </button>
      </div>

      {/* Sit-out Filter — 5-player format only */}
      {hasSitOut && (
        <div className="mb-4">
          <label
            htmlFor="sitOutFilter"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Filter by sit-out player
          </label>
          <select
            id="sitOutFilter"
            value={sitOutFilter}
            onChange={(e) => setSitOutFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All matches ({baseMatches.length})</option>
            {sitOutStats.map((stat) => (
              <option key={stat.name} value={stat.name}>
                {stat.name} sits out (
                {activeTab === "pending" ? stat.pending : stat.completed}{" "}
                matches)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Match List */}
      {displayMatches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {activeTab === "pending"
            ? "No pending matches"
            : "No completed matches yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {displayMatches.map((match) => (
            <div
              key={match.id}
              className={`border rounded-lg p-3 ${
                match.winnerTeam
                  ? "border-gray-200 bg-gray-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              {/* Match Header - More Compact */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Match {match.matchNumber}
                </span>
                {match.sitOutPlayer && (
                  <span className="text-xs text-gray-500">
                    Sit-out: {match.sitOutPlayer.name}
                  </span>
                )}
              </div>

              {/* Teams Layout - Horizontal on Mobile */}
              <div className="flex items-center gap-2 text-sm">
                {/* Team A */}
                <div
                  className={`flex-1 p-2 rounded text-center ${match.winnerTeam === "A" ? "bg-green-100 font-semibold" : ""}`}
                >
                  <div className="text-xs text-gray-600">Team A</div>
                  <div className="font-medium text-gray-900">
                    {match.teamAPlayer1.name} & {match.teamAPlayer2.name}
                  </div>
                  {match.teamAGames !== null && (
                    <div className="text-xl font-bold text-gray-900 mt-1">
                      {match.teamAGames}
                    </div>
                  )}
                </div>

                {/* VS or Action */}
                <div className="flex-shrink-0">
                  {match.winnerTeam ? (
                    <div className="text-gray-400 text-xs">vs</div>
                  ) : (
                    <MatchResultForm match={match} />
                  )}
                </div>

                {/* Team B */}
                <div
                  className={`flex-1 p-2 rounded text-center ${match.winnerTeam === "B" ? "bg-green-100 font-semibold" : ""}`}
                >
                  <div className="text-xs text-gray-600">Team B</div>
                  <div className="font-medium text-gray-900">
                    {match.teamBPlayer1.name} & {match.teamBPlayer2.name}
                  </div>
                  {match.teamBGames !== null && (
                    <div className="text-xl font-bold text-gray-900 mt-1">
                      {match.teamBGames}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit / Remove row for completed matches */}
              {match.winnerTeam && seasonStatus === "ACTIVE" && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end gap-2">
                  <MatchResultForm match={match} isEdit />
                  {isAdhoc && <DeleteAdhocMatchButton matchId={match.id} />}
                </div>
              )}

              {/* Remove button for pending adhoc matches */}
              {!match.winnerTeam && isAdhoc && seasonStatus === "ACTIVE" && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
                  <DeleteAdhocMatchButton matchId={match.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
