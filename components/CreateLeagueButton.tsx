"use client";

import { useState } from "react";
import { createLeague } from "@/app/actions";
import { FORMATS } from "@/lib/formats";

const formatOptions = Object.values(FORMATS);

export default function CreateLeagueButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [formatId, setFormatId] = useState<string>(formatOptions[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("League name cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await createLeague(trimmed, formatId);

    if (result.success) {
      setIsOpen(false);
      setName("");
    } else {
      setError(result.error || "Failed to create league");
    }

    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setError(null);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
      >
        + New League
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Create League
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="leagueName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <input
                  id="leagueName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wednesday League"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div>
                <label
                  htmlFor="leagueFormat"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Format
                </label>
                <select
                  id="leagueFormat"
                  value={formatId}
                  onChange={(e) => setFormatId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {formatOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                  disabled={isLoading || !name.trim()}
                >
                  {isLoading ? "Creating…" : "Create League"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
