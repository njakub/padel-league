"use client";

import { useState } from "react";
import { deleteAdhocMatch } from "@/app/actions";

export default function DeleteAdhocMatchButton({
  matchId,
}: {
  matchId: number;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Remove this match from the session?")) return;
    setIsLoading(true);
    await deleteAdhocMatch(matchId);
    setIsLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      className="text-xs px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
    >
      {isLoading ? "Removing…" : "Remove"}
    </button>
  );
}
