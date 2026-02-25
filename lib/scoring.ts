/**
 * Scoring and points calculation module for Padel League Tracker
 *
 * Scoring rules:
 * - Matches are "first to 4 games"
 * - Valid scores: 4-0, 4-1, 4-2, 4-3 (winner always has 4)
 * - Points per player per match:
 *   - 1 point per game their team won
 *   - PLUS 1 bonus point if their team won the match
 *
 * Examples:
 * - 4-0: winners get 5 points each (4 + 1 bonus), losers get 0
 * - 4-2: winners get 5 points each (4 + 1 bonus), losers get 2
 * - 4-3: winners get 5 points each (4 + 1 bonus), losers get 3
 */

export interface MatchResult {
  teamAGames: number;
  teamBGames: number;
  winnerTeam: "A" | "B";
}

/**
 * Validate a match score
 * Returns true if valid, false otherwise
 */
export function validateScore(teamAGames: number, teamBGames: number): boolean {
  // One team must have exactly 4
  if (teamAGames !== 4 && teamBGames !== 4) {
    return false;
  }

  // The other team must have 0-3
  if (teamAGames === 4) {
    return teamBGames >= 0 && teamBGames <= 3;
  }

  if (teamBGames === 4) {
    return teamAGames >= 0 && teamAGames <= 3;
  }

  return false;
}

/**
 * Parse and validate a match result
 * Returns MatchResult if valid, null otherwise
 */
export function parseMatchResult(
  teamAGames: number,
  teamBGames: number,
): MatchResult | null {
  if (!validateScore(teamAGames, teamBGames)) {
    return null;
  }

  const winnerTeam = teamAGames === 4 ? "A" : "B";

  return {
    teamAGames,
    teamBGames,
    winnerTeam,
  };
}

/**
 * Calculate points for a single player in a match
 * @param gamesWonByTeam Number of games won by the player's team
 * @param didTeamWin Whether the player's team won the match
 * @returns Points earned by the player
 */
export function calculatePlayerPoints(
  gamesWonByTeam: number,
  didTeamWin: boolean,
): number {
  const winBonus = didTeamWin ? 1 : 0;
  return gamesWonByTeam + winBonus;
}

/**
 * Calculate points for all players in a match
 */
export function calculateMatchPoints(result: MatchResult): {
  teamAPointsPerPlayer: number;
  teamBPointsPerPlayer: number;
} {
  const teamAWon = result.winnerTeam === "A";
  const teamBWon = result.winnerTeam === "B";

  return {
    teamAPointsPerPlayer: calculatePlayerPoints(result.teamAGames, teamAWon),
    teamBPointsPerPlayer: calculatePlayerPoints(result.teamBGames, teamBWon),
  };
}

export interface PlayerStats {
  playerId: number;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  points: number;
}

export interface MatchWithPlayers {
  id: number;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number;
  sitOutPlayerId: number | null; // null for 4-player Wednesday League matches
  teamAGames: number | null;
  teamBGames: number | null;
  winnerTeam: string | null;
}

/**
 * Calculate standings from a list of matches
 * @param matches Array of matches with results
 * @param players Map of player ID to player name
 * @returns Array of player stats sorted by points (descending)
 */
export function calculateStandings(
  matches: MatchWithPlayers[],
  players: Map<number, string>,
): PlayerStats[] {
  const stats = new Map<number, PlayerStats>();

  // Initialize stats for all players
  Array.from(players.entries()).forEach(([playerId, playerName]) => {
    stats.set(playerId, {
      playerId,
      playerName,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      points: 0,
    });
  });

  // Process each completed match
  for (const match of matches) {
    // Skip matches without results
    if (
      match.teamAGames === null ||
      match.teamBGames === null ||
      !match.winnerTeam
    ) {
      continue;
    }

    const result = parseMatchResult(match.teamAGames, match.teamBGames);
    if (!result) continue;

    const matchPoints = calculateMatchPoints(result);
    const teamAWon = result.winnerTeam === "A";

    // Update Team A players
    const teamAPlayers = [match.teamAPlayer1Id, match.teamAPlayer2Id];
    for (const playerId of teamAPlayers) {
      const playerStats = stats.get(playerId)!;
      playerStats.matchesPlayed++;
      playerStats.gamesFor += result.teamAGames;
      playerStats.gamesAgainst += result.teamBGames;
      playerStats.points += matchPoints.teamAPointsPerPlayer;

      if (teamAWon) {
        playerStats.wins++;
      } else {
        playerStats.losses++;
      }
    }

    // Update Team B players
    const teamBPlayers = [match.teamBPlayer1Id, match.teamBPlayer2Id];
    for (const playerId of teamBPlayers) {
      const playerStats = stats.get(playerId)!;
      playerStats.matchesPlayed++;
      playerStats.gamesFor += result.teamBGames;
      playerStats.gamesAgainst += result.teamAGames;
      playerStats.points += matchPoints.teamBPointsPerPlayer;

      if (!teamAWon) {
        playerStats.wins++;
      } else {
        playerStats.losses++;
      }
    }
  }

  // Sort by points (descending), then by wins, then by games for
  return Array.from(stats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.gamesFor - a.gamesFor;
  });
}

export interface PairingStats {
  player1Id: number;
  player1Name: string;
  player2Id: number;
  player2Name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  winRate: number; // 0-100
}

/**
 * Calculate per-pair stats: how each duo performs when playing together.
 * Sorted by win rate (desc), then wins, then games for.
 */
export function calculatePairingStats(
  matches: MatchWithPlayers[],
  players: Map<number, string>,
): PairingStats[] {
  const stats = new Map<string, PairingStats>();

  const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  for (const match of matches) {
    if (
      match.teamAGames === null ||
      match.teamBGames === null ||
      !match.winnerTeam
    )
      continue;

    const teamAWon = match.winnerTeam === "A";
    const teams = [
      {
        p1: match.teamAPlayer1Id,
        p2: match.teamAPlayer2Id,
        won: teamAWon,
        gf: match.teamAGames,
        ga: match.teamBGames,
      },
      {
        p1: match.teamBPlayer1Id,
        p2: match.teamBPlayer2Id,
        won: !teamAWon,
        gf: match.teamBGames,
        ga: match.teamAGames,
      },
    ];

    for (const { p1, p2, won, gf, ga } of teams) {
      const key = pairKey(p1, p2);
      if (!stats.has(key)) {
        const [lo, hi] = p1 < p2 ? [p1, p2] : [p2, p1];
        stats.set(key, {
          player1Id: lo,
          player1Name: players.get(lo) ?? String(lo),
          player2Id: hi,
          player2Name: players.get(hi) ?? String(hi),
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          gamesFor: 0,
          gamesAgainst: 0,
          winRate: 0,
        });
      }
      const s = stats.get(key)!;
      s.matchesPlayed++;
      s.gamesFor += gf;
      s.gamesAgainst += ga;
      if (won) s.wins++;
      else s.losses++;
    }
  }

  return Array.from(stats.values())
    .filter((s) => s.matchesPlayed > 0)
    .map((s) => ({
      ...s,
      winRate:
        s.matchesPlayed > 0 ? Math.round((s.wins / s.matchesPlayed) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.gamesFor - a.gamesFor;
    });
}
