import type { PairingStats } from "@/lib/scoring";

export default function PairStandingsTable({
  pairings,
}: {
  pairings: PairingStats[];
}) {
  return (
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
              Points
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Played
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              W-L
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...pairings]
            .sort((a, b) =>
              b.gamesFor !== a.gamesFor
                ? b.gamesFor - a.gamesFor
                : b.wins - a.wins,
            )
            .map((pair, index) => (
              <tr
                key={`${pair.player1Id}-${pair.player2Id}`}
                className={
                  index === 0 && pair.matchesPlayed > 0 ? "bg-yellow-50" : ""
                }
              >
                <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                  {index === 0 && pair.matchesPlayed > 0 && " 🏆"}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                  {pair.player1Name} &amp; {pair.player2Name}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                  {pair.gamesFor}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                  {pair.matchesPlayed}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                  {pair.wins}-{pair.losses}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
