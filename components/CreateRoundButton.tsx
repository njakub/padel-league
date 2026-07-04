"use client";

import { useState } from "react";
import { createRound, createPlayer, suggestWednesdayPairs } from "@/app/actions";

type FixedPairs = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

interface Props {
  leagueId: number;
  leagueName: string;
  roundLengths: number[];
  players: { id: number; name: string }[];
}

export default function CreateRoundButton({
  leagueId,
  leagueName,
  roundLengths,
  players: initialPlayers,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [totalMatches, setTotalMatches] = useState<number>(roundLengths[0]);
  const [roundName, setRoundName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pairs, setPairs] = useState<FixedPairs | null>(null);
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local player pool (starts from DB; grows when a new player is added)
  const [playerPool, setPlayerPool] = useState(initialPlayers);

  // Add-new-player sub-form
  const [newPlayerName, setNewPlayerName] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState<string | null>(null);

  // Quick name lookup
  const playerById = new Map(playerPool.map((p) => [p.id, p.name]));

  /** Build default pairs from the first 8 selected IDs in insertion order. */
  function makeDefaultPairs(ids: number[]): FixedPairs {
    return [
      [ids[0], ids[1]],
      [ids[2], ids[3]],
      [ids[4], ids[5]],
      [ids[6], ids[7]],
    ];
  }

  const togglePlayer = (id: number) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }

    const arr = Array.from(newIds);
    if (arr.length === 8) {
      setPairs(makeDefaultPairs(arr));
    } else {
      setPairs(null);
      setSwapTarget(null);
    }

    setSelectedIds(newIds);
  };

  /** Swap two players between pairs when user click-selects them. */
  const handlePlayerClick = (playerId: number) => {
    if (isLoading || isSuggesting) return;
    if (swapTarget === null) {
      setSwapTarget(playerId);
      return;
    }
    if (swapTarget === playerId) {
      setSwapTarget(null);
      return;
    }
    if (pairs) {
      const newPairs = pairs.map(([a, b]): [number, number] => {
        if (a === swapTarget) return [playerId, b];
        if (b === swapTarget) return [a, playerId];
        if (a === playerId) return [swapTarget, b];
        if (b === playerId) return [a, swapTarget];
        return [a, b];
      }) as FixedPairs;
      setPairs(newPairs);
    }
    setSwapTarget(null);
  };

  const handleSuggestPairs = async () => {
    if (selectedIds.size !== 8) return;
    setIsSuggesting(true);
    setError(null);
    const ids = Array.from(selectedIds);
    const result = await suggestWednesdayPairs(ids);
    if (result.success) {
      setPairs(result.pairs as FixedPairs);
    } else {
      setError(result.error ?? "Failed to suggest pairs.");
    }
    setIsSuggesting(false);
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
    setPairs(null);
    setSwapTarget(null);
    setPlayerPool(initialPlayers);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSelectedIds(new Set());
    setRoundName("");
    setNewPlayerName("");
    setAddPlayerError(null);
    setPairs(null);
    setSwapTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size !== 8) {
      setError("You must select exactly 8 players.");
      return;
    }
    if (!pairs) {
      setError("Please assign or suggest pairs before creating the round.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await createRound(
      leagueId,
      totalMatches,
      pairs,
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
              8 players · 4 fixed pairs · 2 courts · no sit-outs
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
                <div className="grid grid-cols-4 gap-2">
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
                        {option / 2} sessions
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Each session = 2 simultaneous matches · all pair matchups
                  covered once per 6-match cycle
                </p>
              </div>

              {/* Player Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Players{" "}
                  <span
                    className={`font-semibold ${
                      selectedIds.size === 8
                        ? "text-green-600"
                        : selectedIds.size > 8
                          ? "text-red-600"
                          : "text-purple-600"
                    }`}
                  >
                    ({selectedIds.size}/8 selected)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {playerPool.map((player) => {
                    const checked = selectedIds.has(player.id);
                    const atMax = !checked && selectedIds.size >= 8;
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

              {/* ── Pair Assignment (visible once 8 players are selected) ── */}
              {selectedIds.size === 8 && pairs && (
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-purple-900">
                        Fixed Pairs
                      </h3>
                      <p className="text-xs text-purple-700 mt-0.5">
                        These partnerships are fixed for this round.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSuggestPairs}
                      disabled={isLoading || isSuggesting}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                    >
                      {isSuggesting ? (
                        <>
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Calculating…
                        </>
                      ) : (
                        <>✨ Suggest Smart Pairs</>
                      )}
                    </button>
                  </div>

                  {swapTarget !== null && (
                    <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 mb-2">
                      Now click another player to swap, or click the same player
                      to cancel.
                    </p>
                  )}

                  <div className="space-y-2">
                    {pairs.map(([p1Id, p2Id], i) => {
                      const p1Name = playerById.get(p1Id) ?? "?";
                      const p2Name = playerById.get(p2Id) ?? "?";

                      const btnClass = (pid: number) => {
                        const isTarget = swapTarget === pid;
                        const isPending =
                          swapTarget !== null && swapTarget !== pid;
                        return [
                          "flex-1 py-1.5 px-3 rounded-md text-sm font-medium border transition-colors",
                          isTarget
                            ? "bg-blue-100 border-blue-400 text-blue-900 ring-2 ring-blue-300"
                            : isPending
                              ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
                              : "bg-white border-gray-300 text-gray-800 hover:bg-purple-50 hover:border-purple-300 cursor-pointer",
                        ].join(" ");
                      };

                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-purple-500 w-8 text-center font-mono font-bold">
                            P{i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePlayerClick(p1Id)}
                            className={btnClass(p1Id)}
                            disabled={isLoading}
                          >
                            {p1Name}
                          </button>
                          <span className="text-purple-400 font-bold">+</span>
                          <button
                            type="button"
                            onClick={() => handlePlayerClick(p2Id)}
                            className={btnClass(p2Id)}
                            disabled={isLoading}
                          >
                            {p2Name}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-purple-600 mt-3">
                    💡 &quot;Suggest Smart Pairs&quot; hard-avoids partners
                    already used this season and balances team strength.
                    Click any two players to swap them manually.
                  </p>
                </div>
              )}

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
                  disabled={isLoading || selectedIds.size !== 8 || !pairs}
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
