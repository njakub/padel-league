"use client";

import { useState } from "react";
import { createRound, createPlayer } from "@/app/actions";

interface Props {
  leagueId: number;
  leagueName: string;
  roundLengths: number[];
  rosterSize: number;
  players: { id: number; name: string }[];
}

/**
 * Create-round modal for pick-players formats (e.g. 5-player rotation):
 * no pair assignment — just pick exactly `rosterSize` players and the
 * schedule generator handles sit-outs and partner rotation.
 */
export default function CreateRoundPlayersButton({
  leagueId,
  leagueName,
  roundLengths,
  rosterSize,
  players: initialPlayers,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [totalMatches, setTotalMatches] = useState<number>(roundLengths[0]);
  const [roundName, setRoundName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local player pool (starts from DB; grows when a new player is added)
  const [playerPool, setPlayerPool] = useState(initialPlayers);

  // Add-new-player sub-form
  const [newPlayerName, setNewPlayerName] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);

  const togglePlayer = (id: number) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    setSelectedIds(newIds);
  };

  const handleAddNewPlayer = async () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    setAddingPlayer(true);
    setAddPlayerError(null);

    const result = await createPlayer(trimmed);
    if (result.success) {
      setAddPlayerError(
        `"${trimmed}" added! They will appear in the list — close and reopen if not visible.`,
      );
      setNewPlayerName("");
      setPlayerPool((prev) => {
        if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()))
          return prev;
        return [...prev, { id: -(prev.length + 1), name: trimmed }];
      });
    } else {
      setAddPlayerError(result.error || "Failed to add player");
    }
    setAddingPlayer(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setSelectedIds(new Set());
    setRoundName("");
    setTotalMatches(roundLengths[0]);
    setNewPlayerName("");
    setAddPlayerError(null);
    setPlayerPool(initialPlayers);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSelectedIds(new Set());
    setRoundName("");
    setNewPlayerName("");
    setAddPlayerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size !== rosterSize) {
      setError(`You must select exactly ${rosterSize} players.`);
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await createRound(
      leagueId,
      totalMatches,
      { playerIds: Array.from(selectedIds) },
      roundName || undefined,
    );

    if (result.success) {
      handleClose();
    } else {
      setError(result.error || "Failed to create round");
    }

    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-semibold"
      >
        + Create New Round
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Create Round — {leagueName}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {rosterSize} players · 1 court · everyone partners everyone ·
              everyone sits out once per cycle
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Round Name */}
              <div>
                <label
                  htmlFor="roundName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Round Name (optional)
                </label>
                <input
                  id="roundName"
                  type="text"
                  value={roundName}
                  onChange={(e) => setRoundName(e.target.value)}
                  placeholder="e.g., Round 4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate (e.g., &quot;Round 4&quot;)
                </p>
              </div>

              {/* Round Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Round Length
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roundLengths.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTotalMatches(option)}
                      className={`px-3 py-3 rounded-md border-2 transition-colors ${
                        totalMatches === option
                          ? "border-purple-600 bg-purple-50 text-purple-900"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                      disabled={isLoading}
                    >
                      <div className="font-semibold text-sm">
                        {option} matches
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option === roundLengths[0]
                          ? "1 cycle · ~90 min"
                          : `${option / roundLengths[0]} cycles`}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Each cycle: everyone partners everyone once · everyone sits
                  out once · first to 4 games per match
                </p>
              </div>

              {/* Player Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Players{" "}
                  <span
                    className={`font-semibold ${
                      selectedIds.size === rosterSize
                        ? "text-green-600"
                        : selectedIds.size > rosterSize
                          ? "text-red-600"
                          : "text-purple-600"
                    }`}
                  >
                    ({selectedIds.size}/{rosterSize} selected)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {playerPool.map((player) => {
                    const checked = selectedIds.has(player.id);
                    const atMax = !checked && selectedIds.size >= rosterSize;
                    return (
                      <label
                        key={player.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                          checked
                            ? "border-purple-500 bg-purple-50"
                            : atMax || isLoading
                              ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                              : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayer(player.id)}
                          disabled={atMax || isLoading}
                          className="accent-purple-600"
                        />
                        <span className="text-sm font-medium">
                          {player.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Add New Player to Pool */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Player not in the list? Add them to the pool:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewPlayer();
                      }
                    }}
                    placeholder="New player name"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                    disabled={addingPlayer || isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewPlayer}
                    disabled={
                      !newPlayerName.trim() || addingPlayer || isLoading
                    }
                    className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingPlayer ? "Adding..." : "Add"}
                  </button>
                </div>
                {addPlayerError && (
                  <p
                    className={`text-xs mt-1 ${
                      addPlayerError.includes("added")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {addPlayerError}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || selectedIds.size !== rosterSize}
                >
                  {isLoading ? "Creating…" : "Create Round"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
