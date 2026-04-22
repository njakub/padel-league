"use client";

import { useState } from "react";
import { recordMatchResult, deleteMatchResult } from "@/app/actions";

interface Match {
  id: number;
  teamAGames: number | null;
  teamBGames: number | null;
  winnerTeam: string | null;
  teamAPlayer1: { name: string };
  teamAPlayer2: { name: string };
  teamBPlayer1: { name: string };
  teamBPlayer2: { name: string };
}

interface MatchResultFormProps {
  match: Match;
  isEdit?: boolean;
  leagueType?: string;
}

export default function MatchResultForm({
  match,
  isEdit = false,
  leagueType,
}: MatchResultFormProps) {
  const isAmericano = leagueType === "WEDNESDAY";
  const [isOpen, setIsOpen] = useState(false);
  const [teamAGames, setTeamAGames] = useState(
    match.teamAGames?.toString() || "",
  );
  const [teamBGames, setTeamBGames] = useState(
    match.teamBGames?.toString() || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const teamA = parseInt(teamAGames);
    const teamB = parseInt(teamBGames);

    if (isNaN(teamA) || isNaN(teamB)) {
      setError("Please enter valid numbers");
      setIsLoading(false);
      return;
    }

    const result = await recordMatchResult(match.id, teamA, teamB);

    if (result.success) {
      setIsOpen(false);
      setTeamAGames("");
      setTeamBGames("");
    } else {
      setError(result.error || "Failed to record result");
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this result?")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await deleteMatchResult(match.id);

    if (result.success) {
      setIsOpen(false);
    } else {
      setError(result.error || "Failed to delete result");
    }

    setIsLoading(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (isEdit && match.teamAGames !== null && match.teamBGames !== null) {
      setTeamAGames(match.teamAGames.toString());
      setTeamBGames(match.teamBGames.toString());
    }
  };

  const teamAVal = parseInt(teamAGames);
  const teamBVal = parseInt(teamBGames);
  const bothEntered = !isNaN(teamAVal) && !isNaN(teamBVal);
  const runningTotal = bothEntered ? teamAVal + teamBVal : null;
  const totalMismatch = isAmericano && runningTotal !== null && runningTotal !== 32;

  return (
    <>
      <button
        onClick={handleOpen}
        className={`rounded-md transition-colors ${
          isEdit
            ? "text-xs px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            : "px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 font-semibold"
        }`}
      >
        {isEdit ? "Edit" : "Enter Result"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {isEdit ? "Edit Match Result" : "Enter Match Result"}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-700">
                <p className="font-semibold mb-1">Scoring Rules:</p>
                {isAmericano ? (
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Americano — scores must total 32</li>
                    <li>Examples: 20-12, 24-8, 16-16</li>
                    <li>16-16 counts as a draw</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>First to 4 games wins</li>
                    <li>Valid scores: 4-0, 4-1, 4-2, 4-3</li>
                    <li>One team must have exactly 4, the other 0-3</li>
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="teamAGames"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Team A Games
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    ({match.teamAPlayer1.name} & {match.teamAPlayer2.name})
                  </div>
                  <input
                    id="teamAGames"
                    type="number"
                    min="0"
                    max={isAmericano ? "32" : "4"}
                    value={teamAGames}
                    onChange={(e) => setTeamAGames(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="teamBGames"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Team B Games
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    ({match.teamBPlayer1.name} & {match.teamBPlayer2.name})
                  </div>
                  <input
                    id="teamBGames"
                    type="number"
                    min="0"
                    max={isAmericano ? "32" : "4"}
                    value={teamBGames}
                    onChange={(e) => setTeamBGames(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {isAmericano && bothEntered && (
                <div
                  className={`text-center text-sm font-medium py-1 rounded ${
                    totalMismatch
                      ? "text-red-600 bg-red-50"
                      : "text-green-700 bg-green-50"
                  }`}
                >
                  Total: {runningTotal} / 32
                  {!totalMismatch && " ✓"}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError(null);
                    setTeamAGames("");
                    setTeamBGames("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>

                {isEdit && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50 transition-colors"
                    disabled={isLoading}
                  >
                    Delete
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
