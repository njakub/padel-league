"use client";

import { useState } from "react";
import { completeSeasonEarly } from "@/app/actions";

export default function CompleteSeasonEarlyButton({
  leagueSeasonId,
}: {
  leagueSeasonId: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (
      !confirm(
        "End this season now, before a full partner cycle completes? The next round you create will start a new season.",
      )
    ) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await completeSeasonEarly(leagueSeasonId);
    if (!result.success) {
      setError(result.error || "Failed to end season");
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
        onClick={handleClick}
        disabled={isLoading}
        className="px-3 py-1.5 text-sm border-2 border-amber-300 text-amber-800 rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50"
      >
        {isLoading ? "Ending…" : "End Season Early"}
      </button>
    </div>
  );
}
