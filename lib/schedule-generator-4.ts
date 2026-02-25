/**
 * Schedule generation module for 4-player Wednesday League
 *
 * For 4 players there are exactly 3 unique ways to split them into 2 teams of 2:
 *   (0,1) vs (2,3)
 *   (0,2) vs (1,3)
 *   (0,3) vs (1,2)
 *
 * This 3-match base is perfectly balanced:
 *   - Every player partners with every other player exactly once
 *   - Every opponent pairing is faced exactly once
 *
 * Seasons are multiples of 12 (= 4 × base-3) so that:
 *   - Each pair plays together the same number of times
 *   - Each pair faces each opponent pair the same number of times
 */

export interface Match4Config {
  matchNumber: number;
  teamA: [number, number]; // player indices (0-3)
  teamB: [number, number]; // player indices (0-3)
}

/**
 * The 3 unique splits of players [0, 1, 2, 3] into 2 teams of 2
 */
function generateBase3Matches(): Match4Config[] {
  return [
    { matchNumber: 1, teamA: [0, 1], teamB: [2, 3] },
    { matchNumber: 2, teamA: [0, 2], teamB: [1, 3] },
    { matchNumber: 3, teamA: [0, 3], teamB: [1, 2] },
  ];
}

/**
 * Generate a balanced 4-player season schedule.
 * @param totalMatches Must be 12, 24, or 36
 */
export function generateSchedule4(totalMatches: 12 | 24 | 36): Match4Config[] {
  if (![12, 24, 36].includes(totalMatches)) {
    throw new Error("Total matches must be 12, 24, or 36");
  }

  const base3 = generateBase3Matches();
  const fullSchedule: Match4Config[] = [];
  let matchNumber = 1;

  const repetitions = totalMatches / 3;

  for (let rep = 0; rep < repetitions; rep++) {
    for (const match of base3) {
      fullSchedule.push({ ...match, matchNumber: matchNumber++ });
    }
  }

  return fullSchedule;
}

/**
 * Map player indices to actual player IDs from the database.
 * @param matches Schedule with player indices (0-3)
 * @param playerIds Array of exactly 4 player IDs (in order)
 */
export function mapToPlayerIds4(
  matches: Match4Config[],
  playerIds: number[],
): Array<{
  matchNumber: number;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number;
}> {
  if (playerIds.length !== 4) {
    throw new Error("Must provide exactly 4 player IDs");
  }

  return matches.map((match) => ({
    matchNumber: match.matchNumber,
    teamAPlayer1Id: playerIds[match.teamA[0]],
    teamAPlayer2Id: playerIds[match.teamA[1]],
    teamBPlayer1Id: playerIds[match.teamB[0]],
    teamBPlayer2Id: playerIds[match.teamB[1]],
  }));
}
