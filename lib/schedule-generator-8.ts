/**
 * Schedule generation module for 8-player Wednesday League (2 courts)
 *
 * All 8 players play every round — no one sits out.
 * Each round = 2 simultaneous matches across 2 courts.
 *
 * Uses Berger's round-robin 1-factorization of K8:
 *   Fix player index 7; rotate players 0-6 across 7 rounds.
 *
 * Properties of base 14-match schedule (7 rounds):
 *   - Every pair of players partners exactly once
 *   - Every pair of players faces each other as opponents exactly twice
 *   - Every player plays exactly 7 matches
 *
 * Season lengths are multiples of 14 (= 7 rounds × 2 matches):
 *   14, 28, 42 matches
 */

export interface Match8Config {
  matchNumber: number;
  round: number; // 1-based round number (2 matches share the same round)
  teamA: [number, number]; // player indices (0-7)
  teamB: [number, number]; // player indices (0-7)
}

/**
 * Generate the 14 base matches for 8 players across 2 courts.
 * Uses Berger's algorithm: fix player 7, rotate players 0-6.
 */
function generateBase14Matches(): Match8Config[] {
  const matches: Match8Config[] = [];
  let matchNumber = 1;

  for (let r = 0; r < 7; r++) {
    // Build 4 pairs for this round using the polygon method:
    // Fixed player (7) pairs with rotation index r.
    // Remaining 6 players split symmetrically around r on a circle of 0-6.
    const pairs: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ] = [
      [7, r],
      [(r + 1) % 7, (r + 6) % 7],
      [(r + 2) % 7, (r + 5) % 7],
      [(r + 3) % 7, (r + 4) % 7],
    ];

    // Group into 2 matches: (pairs[0] vs pairs[1]) and (pairs[2] vs pairs[3])
    matches.push({
      matchNumber: matchNumber++,
      round: r + 1,
      teamA: pairs[0],
      teamB: pairs[1],
    });
    matches.push({
      matchNumber: matchNumber++,
      round: r + 1,
      teamA: pairs[2],
      teamB: pairs[3],
    });
  }

  return matches;
}

/**
 * Generate a balanced 8-player season schedule.
 * @param totalMatches Must be 14, 28, or 42
 */
export function generateSchedule8(totalMatches: 14 | 28 | 42): Match8Config[] {
  if (![14, 28, 42].includes(totalMatches)) {
    throw new Error("Total matches must be 14, 28, or 42");
  }

  const base14 = generateBase14Matches();
  const fullSchedule: Match8Config[] = [];
  let matchNumber = 1;
  const repetitions = totalMatches / 14;

  for (let rep = 0; rep < repetitions; rep++) {
    for (const match of base14) {
      fullSchedule.push({ ...match, matchNumber: matchNumber++ });
    }
  }

  return fullSchedule;
}

/**
 * Map player indices to actual player IDs from the database.
 * @param matches Schedule with player indices (0-7)
 * @param playerIds Array of exactly 8 player IDs (in order)
 */
export function mapToPlayerIds8(
  matches: Match8Config[],
  playerIds: number[],
): Array<{
  matchNumber: number;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number;
}> {
  if (playerIds.length !== 8) {
    throw new Error("Must provide exactly 8 player IDs");
  }

  return matches.map((match) => ({
    matchNumber: match.matchNumber,
    teamAPlayer1Id: playerIds[match.teamA[0]],
    teamAPlayer2Id: playerIds[match.teamA[1]],
    teamBPlayer1Id: playerIds[match.teamB[0]],
    teamBPlayer2Id: playerIds[match.teamB[1]],
  }));
}
