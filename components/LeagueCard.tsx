import Link from "next/link";

export interface LeagueCardData {
  id: number;
  name: string;
  formatLabel: string;
  activeRound: {
    id: number;
    name: string;
    completedCount: number;
    totalMatches: number | null;
  } | null;
  currentSeasonNumber: number | null;
  seasonRoundsTarget: number | null;
  completedRoundsInSeason: number;
  topTally: { playerId: number; playerName: string; points: number }[];
}

export default function LeagueCard({ league }: { league: LeagueCardData }) {
  return (
    <Link
      href={`/league/${league.id}`}
      className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="text-xl font-bold text-gray-900">{league.name}</h2>
        <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 whitespace-nowrap">
          {league.formatLabel}
        </span>
      </div>

      {league.currentSeasonNumber !== null && (
        <p className="text-sm text-gray-600 mb-2">
          Season {league.currentSeasonNumber}
          {league.seasonRoundsTarget !== null &&
            ` — Round ${league.completedRoundsInSeason} of ${league.seasonRoundsTarget}`}
        </p>
      )}

      {league.activeRound ? (
        <p className="text-sm text-green-700 mb-3">
          🟢 {league.activeRound.name} active —{" "}
          {league.activeRound.completedCount}/
          {league.activeRound.totalMatches ?? "?"} matches
        </p>
      ) : (
        <p className="text-sm text-gray-500 mb-3">No active round</p>
      )}

      {league.topTally.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Top of the table
          </p>
          <ol className="text-sm text-gray-800 space-y-0.5">
            {league.topTally.map((p, i) => (
              <li key={p.playerId}>
                {i + 1}. {p.playerName} — {p.points} pts
              </li>
            ))}
          </ol>
        </div>
      )}
    </Link>
  );
}
