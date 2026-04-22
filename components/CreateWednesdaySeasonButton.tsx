"use client";

import { useState } from "react";
import { createWednesdaySeason, createPlayer } from "@/app/actions";

interface Props {
  players: { id: number; name: string }[];
}

// null means the slot is empty
type Pair = [number | null, number | null];
const EMPTY_PAIRS: [Pair, Pair, Pair, Pair] = [
  [null, null],
  [null, null],
  [null, null],
  [null, null],
];

export default function CreateWednesdaySeasonButton({
  players: initialPlayers,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [totalMatches, setTotalMatches] = useState<6 | 12 | 18 | 24>(6);
  const [seasonName, setSeasonName] = useState("");
  const [pairs, setPairs] = useState<[Pair, Pair, Pair, Pair]>(
    structuredClone(EMPTY_PAIRS),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playerPool, setPlayerPool] = useState(initialPlayers);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);

  // All player IDs currently assigned to any slot
  const assignedIds = new Set(pairs.flat().filter((id): id is number => id !== null));

  const assignToSlot = (pairIdx: number, slot: 0 | 1, playerId: number | null) => {
    setPairs((prev) => {
      const next: [Pair, Pair, Pair, Pair] = prev.map((p) => [...p] as Pair) as [
        Pair, Pair, Pair, Pair,
      ];
      // If this player is already assigned elsewhere, remove them first
      if (playerId !== null) {
        for (let pi = 0; pi < 4; pi++) {
          for (let si = 0; si < 2; si++) {
            if (next[pi][si] === playerId) next[pi][si] = null;
          }
        }
      }
      next[pairIdx][slot] = playerId;
      return next;
    });
  };

  const allPairsFull = pairs.every((p) => p[0] !== null && p[1] !== null);

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setPairs(structuredClone(EMPTY_PAIRS));
    setSeasonName("");
    setTotalMatches(6);
    setNewPlayerName("");
    setAddPlayerError(null);
    setPlayerPool(initialPlayers);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setPairs(structuredClone(EMPTY_PAIRS));
    setSeasonName("");
    setNewPlayerName("");
    setAddPlayerError(null);
  };

  const handleAddNewPlayer = async () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    setAddingPlayer(true);
    setAddPlayerError(null);
    const result = await createPlayer(trimmed);
    if (result.success) {
      setAddPlayerError(`"${trimmed}" added! They will appear in the dropdowns.`);
      setNewPlayerName("");
      setPlayerPool((prev) => {
        if (prev.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()))
          return prev;
        return [...prev, { id: -(prev.length + 1), name: trimmed }];
      });
    } else {
      setAddPlayerError(result.error ?? "Failed to add player");
    }
    setAddingPlayer(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPairsFull) {
      setError("All 4 pairs must have 2 players assigned.");
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await createWednesdaySeason(
      totalMatches,
      pairs as [[number, number], [number, number], [number, number], [number, number]],
      seasonName || undefined,
    );
    if (result.success) {
      handleClose();
    } else {
      setError(result.error ?? "Failed to create season");
    }
    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-semibold"
      >
        + Create New Season
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Create Americano Pairs Season
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              4 fixed pairs · 2 courts · no sit-outs
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Season Name */}
              <div>
                <label
                  htmlFor="wednesdaySeasonName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Season Name (optional)
                </label>
                <input
                  id="wednesdaySeasonName"
                  type="text"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  placeholder="e.g., Spring 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate (e.g., &quot;Americano Season 1&quot;)
                </p>
              </div>

              {/* Season Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Season Length
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([6, 12, 18, 24] as const).map((option) => (
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
                      <div className="font-semibold">{option}</div>
                      <div className="text-xs text-gray-500">matches</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option / 6}× cycle
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  1 cycle = 6 matches (3 rounds) · every pair faces every other pair once
                </p>
              </div>

              {/* Pair Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Players to Pairs
                </label>
                <div className="space-y-2">
                  {([0, 1, 2, 3] as const).map((pi) => {
                    const pairColors = [
                      "border-blue-300 bg-blue-50",
                      "border-green-300 bg-green-50",
                      "border-orange-300 bg-orange-50",
                      "border-pink-300 bg-pink-50",
                    ];
                    return (
                      <div
                        key={pi}
                        className={`flex items-center gap-2 p-2 rounded-md border ${pairColors[pi]}`}
                      >
                        <span className="text-xs font-bold text-gray-500 w-12 shrink-0">
                          Pair {pi + 1}
                        </span>
                        {([0, 1] as const).map((si) => {
                          const currentId = pairs[pi][si];
                          return (
                            <select
                              key={si}
                              value={currentId ?? ""}
                              onChange={(e) =>
                                assignToSlot(
                                  pi,
                                  si,
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              disabled={isLoading}
                              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              <option value="">— player {si + 1} —</option>
                              {playerPool.map((p) => {
                                const takenElsewhere =
                                  assignedIds.has(p.id) && p.id !== currentId;
                                if (takenElsewhere) return null;
                                return (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        })}
                      </div>
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
                    disabled={!newPlayerName.trim() || addingPlayer || isLoading}
                    className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingPlayer ? "Adding..." : "Add"}
                  </button>
                </div>
                {addPlayerError && (
                  <p
                    className={`text-xs mt-1 ${
                      addPlayerError.includes("added") ? "text-green-600" : "text-red-600"
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
                  disabled={isLoading || !allPairsFull}
                >
                  {isLoading ? "Creating..." : "Create Season"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
