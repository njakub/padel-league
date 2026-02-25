import type { PairingStats } from "@/lib/scoring";

interface PairingsTableProps {
  pairings: PairingStats[];
  title?: string;
  subtitle?: string;
}

export default function PairingsTable({
  pairings,
  title = "Most Effective Pairings",
  subtitle,
}: PairingsTableProps) {
  if (pairings.length === 0) return null;

  const top = pairings[0];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mb-3">{subtitle}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pair
              </th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Win&nbsp;%
              </th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Played
              </th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                W-L
              </th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Games
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pairings.map((pair, index) => {
              const isTop =
                pair.player1Id === top.player1Id &&
                pair.player2Id === top.player2Id;
              return (
                <tr
                  key={`${pair.player1Id}-${pair.player2Id}`}
                  className={isTop ? "bg-yellow-50" : ""}
                >
                  <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                    {isTop && " 🥇"}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pair.player1Name} &amp; {pair.player2Name}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-sm text-center">
                    <span
                      className={`font-bold ${
                        pair.winRate >= 60
                          ? "text-green-600"
                          : pair.winRate >= 40
                            ? "text-gray-700"
                            : "text-red-500"
                      }`}
                    >
                      {pair.winRate}%
                    </span>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                    {pair.matchesPlayed}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                    {pair.wins}-{pair.losses}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                    {pair.gamesFor}-{pair.gamesAgainst}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
