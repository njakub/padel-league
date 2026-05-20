/**
 * Pair suggestion for the Wednesday Americano Pairs League.
 *
 * Given 8 players, enumerates all 105 ways to partition them into 4 fixed
 * pairs and returns the partition with the highest score.
 *
 * Scoring (higher = better):
 *   PRIMARY:   Avoid pairs that have already been partners in previous seasons.
 *              Each historical pairing incurs a -100 penalty per occurrence.
 *   SECONDARY: Prefer pairing players far apart in the standings (strong + weak)
 *              so every team has a mix of ability and competition stays balanced.
 *              +1 per rank-position gap within a pair.
 */

export type FixedPairs = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

/**
 * Suggest the best 4 fixed pairs from 8 player IDs.
 *
 * @param playerIds      Exactly 8 player IDs to partition.
 * @param rankMap        playerId → rank (1 = top of standings, 8 = bottom).
 *                       Players not in the map default to rank 4 (mid-table).
 * @param pairingHistory "minId-maxId" → number of times those two players have
 *                       been paired as partners across all historical seasons.
 */
export function suggestFixedPairs(
  playerIds: number[],
  rankMap: Map<number, number>,
  pairingHistory: Map<string, number>,
): FixedPairs {
  if (playerIds.length !== 8) {
    throw new Error("suggestFixedPairs requires exactly 8 player IDs");
  }

  const HISTORY_WEIGHT = 100;

  const pairKey = (a: number, b: number) =>
    `${Math.min(a, b)}-${Math.max(a, b)}`;

  /** Recursively enumerate all ways to partition `ids` into pairs. */
  function partitions(ids: number[]): [number, number][][] {
    if (ids.length === 0) return [[]];
    const [first, ...rest] = ids;
    const result: [number, number][][] = [];
    for (let i = 0; i < rest.length; i++) {
      const partner = rest[i];
      const remaining = rest.filter((_, j) => j !== i);
      for (const sub of partitions(remaining)) {
        result.push([[first, partner], ...sub]);
      }
    }
    return result;
  }

  function scorePartition(partition: [number, number][]): number {
    let score = 0;
    for (const [a, b] of partition) {
      const historyCount = pairingHistory.get(pairKey(a, b)) ?? 0;
      const rankA = rankMap.get(a) ?? 4;
      const rankB = rankMap.get(b) ?? 4;
      score -= HISTORY_WEIGHT * historyCount;
      score += Math.abs(rankA - rankB);
    }
    return score;
  }

  let bestPairs: [number, number][] | null = null;
  let bestScore = -Infinity;

  for (const partition of partitions(playerIds)) {
    const s = scorePartition(partition);
    if (s > bestScore) {
      bestScore = s;
      bestPairs = partition;
    }
  }

  return bestPairs as FixedPairs;
}
