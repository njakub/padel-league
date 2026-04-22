/**
 * Schedule generation module for 8-player Wednesday League (fixed pairs, 2 courts)
 *
 * Players are grouped into 4 fixed pairs for the whole season.
 * Each round: all 4 pairs play simultaneously across 2 courts — no one sits out.
 *
 * With 4 pairs there are C(4,2) = 6 possible pair-vs-pair matchups.
 * Using a 1-factorization of K4 (Berger's algorithm):
 *
 *   Round 1: pair[0] vs pair[1]  |  pair[2] vs pair[3]
 *   Round 2: pair[0] vs pair[2]  |  pair[1] vs pair[3]
 *   Round 3: pair[0] vs pair[3]  |  pair[1] vs pair[2]
 *
 * Base schedule = 6 matches (3 rounds × 2 courts).
 *
 * Properties of base schedule:
 *   - Every pair faces every other pair exactly once
 *   - Every pair plays exactly 3 matches
 *   - All 6 possible pair-vs-pair matchups covered
 *
 * Season lengths are multiples of 6: 6, 12, 18, 24.
 */

export interface MatchPairsConfig {
  matchNumber: number;
  round: number; // 1-based
  // pair indices (0-3); each pair maps to 2 player IDs
  pairA: number;
  pairB: number;
}

/** The 6 base matches (3 rounds × 2 courts) */
function generateBase6Matches(): MatchPairsConfig[] {
  // 1-factorization of K4: 3 perfect matchings of pairs [0,1,2,3]
  const rounds: [[number, number], [number, number]][] = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];

  const matches: MatchPairsConfig[] = [];
  let matchNumber = 1;
  for (let r = 0; r < 3; r++) {
    const [court1, court2] = rounds[r];
    matches.push({ matchNumber: matchNumber++, round: r + 1, pairA: court1[0], pairB: court1[1] });
    matches.push({ matchNumber: matchNumber++, round: r + 1, pairA: court2[0], pairB: court2[1] });
  }
  return matches;
}

/**
 * Generate a balanced fixed-pairs season schedule.
 * @param totalMatches Must be 6, 12, 18, or 24
 */
export function generateSchedulePairs(totalMatches: 6 | 12 | 18 | 24): MatchPairsConfig[] {
  if (![6, 12, 18, 24].includes(totalMatches)) {
    throw new Error("Total matches must be 6, 12, 18, or 24");
  }

  const base6 = generateBase6Matches();
  const fullSchedule: MatchPairsConfig[] = [];
  let matchNumber = 1;
  const repetitions = totalMatches / 6;

  for (let rep = 0; rep < repetitions; rep++) {
    for (const match of base6) {
      fullSchedule.push({ ...match, matchNumber: matchNumber++ });
    }
  }
  return fullSchedule;
}

/**
 * Map pair indices to actual player IDs.
 * @param matches   Schedule with pair indices (0-3)
 * @param pairs     Array of exactly 4 pairs, each pair is [player1Id, player2Id]
 */
export function mapToPlayerIdsPairs(
  matches: MatchPairsConfig[],
  pairs: [[number, number], [number, number], [number, number], [number, number]],
): Array<{
  matchNumber: number;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number;
}> {
  return matches.map((match) => ({
    matchNumber: match.matchNumber,
    teamAPlayer1Id: pairs[match.pairA][0],
    teamAPlayer2Id: pairs[match.pairA][1],
    teamBPlayer1Id: pairs[match.pairB][0],
    teamBPlayer2Id: pairs[match.pairB][1],
  }));
}
