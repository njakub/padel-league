"use client";

import { useState } from "react";
import { addAdhocMatch } from "@/app/actions";

interface Player {
  id: number;
  name: string;
}

interface AddAdhocMatchButtonProps {
  seasonId: number;
  players: Player[];
}

export default function AddAdhocMatchButton({
  seasonId,
  players,
}: AddAdhocMatchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setA1("");
    setA2("");
    setB1("");
    setB2("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const ids = [Number(a1), Number(a2), Number(b1), Number(b2)];
    if (ids.some((id) => !id)) {
      setError("Please select all 4 players.");
      setIsLoading(false);
      return;
    }
    if (new Set(ids).size !== 4) {
      setError("All 4 players must be different.");
      setIsLoading(false);
      return;
    }

    const result = await addAdhocMatch(
      seasonId,
      Number(a1),
      Number(a2),
      Number(b1),
      Number(b2),
    );

    if (result.success) {
      setIsOpen(false);
      reset();
    } else {
      setError(result.error || "Failed to add match");
    }

    setIsLoading(false);
  };

  const playerSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    id: string,
  ) => (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        disabled={isLoading}
        required
      >
        <option value="">Select player…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-semibold text-sm"
      >
        + Add Match
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add Adhoc Match
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Team A
                </div>
                <div className="space-y-2">
                  {playerSelect("Player 1", a1, setA1, "a1")}
                  {playerSelect("Player 2", a2, setA2, "a2")}
                </div>
              </div>

              <div className="text-center text-xs font-bold text-gray-400 uppercase">
                vs
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Team B
                </div>
                <div className="space-y-2">
                  {playerSelect("Player 1", b1, setB1, "b1")}
                  {playerSelect("Player 2", b2, setB2, "b2")}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    reset();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Adding…" : "Add Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
