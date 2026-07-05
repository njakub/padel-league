import type { PlacementStanding } from "@/lib/scoring";

export default function PlacementStandingsTable({
  standings,
}: {
  standings: PlacementStanding[];
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
              Player
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Points
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rounds
            </th>
            <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              🥇
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
          {standings.map((stat, index) => (
            <tr
              key={stat.playerId}
              className={index === 0 ? "bg-yellow-50" : ""}
            >
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-900">
                {index + 1}
                {index === 0 && " 🏆"}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                {stat.playerName}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                {stat.placementPoints}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                {stat.roundsPlayed}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                {stat.firsts}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                {stat.wins}-{stat.losses}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-sm text-gray-600 text-center">
                {stat.gamesFor}-{stat.gamesAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
