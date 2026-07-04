"use client";

import { useState } from "react";
import { completeRound } from "@/app/actions";

interface CompleteRoundButtonProps {
  roundId: number;
}

export default function CompleteRoundButton({
  roundId,
}: CompleteRoundButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (
      !confirm(
        "Are you sure you want to mark this round as completed? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await completeRound(roundId);

    if (!result.success) {
      setError(result.error || "Failed to complete round");
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
