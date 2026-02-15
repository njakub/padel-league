"use client";

import { useState } from "react";
import { completeSeason } from "@/app/actions";

interface CompleteSeasonButtonProps {
  seasonId: number;
}

export default function CompleteSeasonButton({
  seasonId,
}: CompleteSeasonButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (
      !confirm(
        "Are you sure you want to mark this season as completed? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await completeSeason(seasonId);

    if (!result.success) {
      setError(result.error || "Failed to complete season");
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        onClick={handleComplete}
        disabled={isLoading}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Completing..." : "Mark as Completed"}
      </button>
    </div>
  );
}
