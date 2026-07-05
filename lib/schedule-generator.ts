/**
 * Schedule generation module for Padel League Tracker
 *
 * Generates perfectly balanced schedules where:
 * 1) Every pair of players teams up the same number of times
 * 2) For each teammate pair, they face each possible opponent pair the same number of times
 *
 * Base schedule is 15 matches (all unique configurations).
 * Longer seasons (30, 45, 60) repeat the base schedule.
 */

export interface MatchConfig {
  matchNumber: number;
  sitOut: number; // player index (0-4)
  teamA: [number, number]; // player indices
  teamB: [number, number]; // player indices
}

/**
 * Generate all unique match configurations for 5 players
 * Returns 15 matches (5 sit-outs × 3 team splits)
 */
function generateBase15Matches(): MatchConfig[] {
  const matches: MatchConfig[] = [];
  let matchNumber = 1;

  // For each possible sit-out player (0-4)
  for (let sitOut = 0; sitOut < 5; sitOut++) {
    // Get the 4 playing players
    const playing = [0, 1, 2, 3, 4].filter((i) => i !== sitOut);

    // There are exactly 3 ways to split 4 players into 2 teams of 2
    // For players [a, b, c, d], the 3 unique splits are:
    // 1. (a,b) vs (c,d)
    // 2. (a,c) vs (b,d)
    // 3. (a,d) vs (b,c)

    const [a, b, c, d] = playing;

    const splits: [number, number, number, number][] = [
      [a, b, c, d],
      [a, c, b, d],
      [a, d, b, c],
    ];

    for (const [p1, p2, p3, p4] of splits) {
      matches.push({
        matchNumber: matchNumber++,
        sitOut,
        teamA: [p1, p2],
        teamB: [p3, p4],
      });
    }
  }

  return matches;
}

/**
 * Generate one balanced single-session cycle for 5 players:
 *   - every player sits out exactly once
 *   - every pair of players teams up exactly once (all 10 pairs covered)
 *   - every player faces every other player exactly twice
 *
 * Construction: in match r (0-4), player r sits out and the teams are
 * {r+1, r+4} vs {r+2, r+3} (mod 5). Across the 5 matches this uses each
 * of the 10 edges of K5 as a partnership exactly once.
 *
 * totalMatches 10 repeats the cycle (every pair partners exactly twice).
 */
export function generateCycleSchedule(totalMatches: 5 | 10): MatchConfig[] {
  if (![5, 10].includes(totalMatches)) {
    throw new Error("Total matches must be 5 or 10");
  }

  const base: MatchConfig[] = [];
  for (let r = 0; r < 5; r++) {
    base.push({
      matchNumber: r + 1,
      sitOut: r,
      teamA: [(r + 1) % 5, (r + 4) % 5],
      teamB: [(r + 2) % 5, (r + 3) % 5],
    });
  }

  if (totalMatches === 5) return base;
  return [
    ...base,
    ...base.map((m) => ({ ...m, matchNumber: m.matchNumber + 5 })),
  ];
}

/**
 * Generate schedule for a season
 * @param totalMatches Must be 15, 30, 45, or 60
 * @returns Array of match configurations
 */
export function generateSchedule(
  totalMatches: 15 | 30 | 45 | 60,
): MatchConfig[] {
  if (![15, 30, 45, 60].includes(totalMatches)) {
    throw new Error("Total matches must be 15, 30, 45, or 60");
  }

  const base15 = generateBase15Matches();
  const repetitions = totalMatches / 15;

  if (repetitions === 1) {
    return base15;
  }

  // Repeat base schedule for longer seasons
  const fullSchedule: MatchConfig[] = [];
  let matchNumber = 1;

  for (let rep = 0; rep < repetitions; rep++) {
    for (const match of base15) {
      fullSchedule.push({
        ...match,
        matchNumber: matchNumber++,
      });
    }
  }

  return fullSchedule;
}

/**
 * Verify schedule balance constraints
 * Returns analysis of teammate pairings and opponent matchups
 */
export function verifyScheduleBalance(matches: MatchConfig[]): {
  isBalanced: boolean;
  teammatePairCounts: Map<string, number>;
  opponentPairCounts: Map<string, Map<string, number>>;
  issues: string[];
} {
  const teammatePairCounts = new Map<string, number>();
  const opponentPairCounts = new Map<string, Map<string, number>>();
  const issues: string[] = [];

  // Helper to create a sorted pair key
  const pairKey = (p1: number, p2: number) => {
    return p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
  };

  // Count teammate pairings and opponent matchups
  for (const match of matches) {
    const teamAPair = pairKey(match.teamA[0], match.teamA[1]);
    const teamBPair = pairKey(match.teamB[0], match.teamB[1]);

    // Count teammate pairings
    teammatePairCounts.set(
      teamAPair,
      (teammatePairCounts.get(teamAPair) || 0) + 1,
    );
    teammatePairCounts.set(
      teamBPair,
      (teammatePairCounts.get(teamBPair) || 0) + 1,
    );

    // Count opponent matchups for each teammate pair
    if (!opponentPairCounts.has(teamAPair)) {
      opponentPairCounts.set(teamAPair, new Map());
    }
    if (!opponentPairCounts.has(teamBPair)) {
      opponentPairCounts.set(teamBPair, new Map());
    }

    const teamAOpponents = opponentPairCounts.get(teamAPair)!;
    const teamBOpponents = opponentPairCounts.get(teamBPair)!;

    teamAOpponents.set(teamBPair, (teamAOpponents.get(teamBPair) || 0) + 1);
    teamBOpponents.set(teamAPair, (teamBOpponents.get(teamAPair) || 0) + 1);
  }

  // Verify all teammate pairs have the same count
  const counts = Array.from(teammatePairCounts.values());
  const expectedTeammateCount = counts[0];

  if (!counts.every((c) => c === expectedTeammateCount)) {
    issues.push("Teammate pair counts are not balanced");
  }

  // Verify for each teammate pair, opponent pair counts are equal
  Array.from(opponentPairCounts.entries()).forEach(([pair, opponents]) => {
    const opponentCounts = Array.from(opponents.values());
    const expectedOpponentCount = opponentCounts[0];

    if (!opponentCounts.every((c) => c === expectedOpponentCount)) {
      issues.push(`Opponent balance violated for teammate pair ${pair}`);
    }
  });

  return {
    isBalanced: issues.length === 0,
    teammatePairCounts,
    opponentPairCounts,
    issues,
  };
}

/**
 * Map player indices to player IDs from database
 * @param matches Schedule with player indices (0-4)
 * @param playerIds Array of 5 player IDs from database (in order)
 * @returns Schedule with actual player IDs
 */
export function mapToPlayerIds(
  matches: MatchConfig[],
  playerIds: number[],
): Array<{
  matchNumber: number;
  sitOutPlayerId: number;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number;
}> {
  if (playerIds.length !== 5) {
    throw new Error("Must provide exactly 5 player IDs");
  }

  return matches.map((match) => ({
    matchNumber: match.matchNumber,
    sitOutPlayerId: playerIds[match.sitOut],
    teamAPlayer1Id: playerIds[match.teamA[0]],
    teamAPlayer2Id: playerIds[match.teamA[1]],
    teamBPlayer1Id: playerIds[match.teamB[0]],
    teamBPlayer2Id: playerIds[match.teamB[1]],
  }));
}
