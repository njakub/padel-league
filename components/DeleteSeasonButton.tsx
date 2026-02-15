"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSeason } from "@/app/actions";

interface DeleteSeasonButtonProps {
  seasonId: number;
  seasonName: string;
}

export default function DeleteSeasonButton({
  seasonId,
  seasonName,
}: DeleteSeasonButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    const result = await deleteSeason(seasonId);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Failed to delete season");
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 border-2 border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
      >
        Delete Season
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Delete Season?
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{seasonName}</span>?
              </p>
              <p className="text-sm text-red-600 font-medium">
                This will permanently delete all matches and results. This
                action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete Season"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
