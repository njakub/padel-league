"use client";

import { useState } from "react";
import { createSeason } from "@/app/actions";

export default function CreateSeasonButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [totalMatches, setTotalMatches] = useState<15 | 30 | 45 | 60>(15);
  const [seasonName, setSeasonName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await createSeason(totalMatches, seasonName || undefined);

    if (result.success) {
      setIsOpen(false);
      setSeasonName("");
      setTotalMatches(15);
    } else {
      setError(result.error || "Failed to create season");
    }

    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold"
      >
        + Create New Season
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Create New Season
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="seasonName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Season Name (optional)
                </label>
                <input
                  id="seasonName"
                  type="text"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  placeholder="e.g., Spring 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate (e.g., &quot;Season 1&quot;)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Season Length
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[15, 30, 45, 60].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setTotalMatches(option as 15 | 30 | 45 | 60)
                      }
                      className={`px-4 py-3 rounded-md border-2 transition-colors ${
                        totalMatches === option
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                      disabled={isLoading}
                    >
                      <div className="font-semibold">{option} matches</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {option === 15 && "Base schedule"}
                        {option === 30 && "2× repetition"}
                        {option === 45 && "3× repetition"}
                        {option === 60 && "4× repetition"}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  All seasons are perfectly balanced for 5 players
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError(null);
                    setSeasonName("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
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
