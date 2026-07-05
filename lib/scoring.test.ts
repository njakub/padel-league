import { describe, it, expect } from "vitest";
import {
  validateScore,
  parseMatchResult,
  calculatePlayerPoints,
  calculateMatchPoints,
  calculateStandings,
  calculatePairingStats,
  calculateRoundPlacements,
  calculatePlacementStandings,
  type MatchWithPlayers,
} from "./scoring";

describe("Scoring", () => {
  describe("validateScore", () => {
    it("should accept valid scores", () => {
      expect(validateScore(4, 0)).toBe(true);
      expect(validateScore(4, 1)).toBe(true);
      expect(validateScore(4, 2)).toBe(true);
      expect(validateScore(4, 3)).toBe(true);
      expect(validateScore(0, 4)).toBe(true);
      expect(validateScore(1, 4)).toBe(true);
      expect(validateScore(2, 4)).toBe(true);
      expect(validateScore(3, 4)).toBe(true);
    });

    it("should reject invalid scores", () => {
      expect(validateScore(3, 3)).toBe(false);
      expect(validateScore(4, 4)).toBe(false);
      expect(validateScore(5, 4)).toBe(false);
      expect(validateScore(4, 5)).toBe(false);
      expect(validateScore(3, 2)).toBe(false);
      expect(validateScore(0, 0)).toBe(false);
      expect(validateScore(4, -1)).toBe(false);
    });
  });

  describe("parseMatchResult", () => {
    it("should parse valid Team A wins", () => {
      const result = parseMatchResult(4, 2);
      expect(result).toEqual({
        teamAGames: 4,
        teamBGames: 2,
        winnerTeam: "A",
      });
    });

    it("should parse valid Team B wins", () => {
      const result = parseMatchResult(1, 4);
      expect(result).toEqual({
        teamAGames: 1,
        teamBGames: 4,
        winnerTeam: "B",
      });
    });

    it("should return null for invalid scores", () => {
      expect(parseMatchResult(3, 3)).toBeNull();
      expect(parseMatchResult(4, 4)).toBeNull();
      expect(parseMatchResult(5, 2)).toBeNull();
    });
  });

  describe("calculatePlayerPoints", () => {
    it("should calculate 5 points for winner with 4 games (4 + 1 bonus)", () => {
      expect(calculatePlayerPoints(4, true)).toBe(5);
    });

    it("should calculate 0 points for loser with 0 games", () => {
      expect(calculatePlayerPoints(0, false)).toBe(0);
    });

    it("should calculate 2 points for loser with 2 games (no bonus)", () => {
      expect(calculatePlayerPoints(2, false)).toBe(2);
    });

    it("should calculate 3 points for loser with 3 games (no bonus)", () => {
      expect(calculatePlayerPoints(3, false)).toBe(3);
    });

    it("should handle edge case of 0 games winner (impossible but test logic)", () => {
      expect(calculatePlayerPoints(0, true)).toBe(1); // 0 + 1 bonus
    });
  });

  describe("calculateMatchPoints", () => {
    it("should calculate points for 4-0 match", () => {
      const result = { teamAGames: 4, teamBGames: 0, winnerTeam: "A" as const };
      const points = calculateMatchPoints(result);

      expect(points.teamAPointsPerPlayer).toBe(5); // 4 + 1 bonus
      expect(points.teamBPointsPerPlayer).toBe(0); // 0 + 0 bonus
    });

    it("should calculate points for 4-2 match", () => {
      const result = { teamAGames: 4, teamBGames: 2, winnerTeam: "A" as const };
      const points = calculateMatchPoints(result);

      expect(points.teamAPointsPerPlayer).toBe(5); // 4 + 1 bonus
      expect(points.teamBPointsPerPlayer).toBe(2); // 2 + 0 bonus
    });

    it("should calculate points for 4-3 match", () => {
      const result = { teamAGames: 4, teamBGames: 3, winnerTeam: "A" as const };
      const points = calculateMatchPoints(result);

      expect(points.teamAPointsPerPlayer).toBe(5); // 4 + 1 bonus
      expect(points.teamBPointsPerPlayer).toBe(3); // 3 + 0 bonus
    });

    it("should calculate points for Team B win", () => {
      const result = { teamAGames: 1, teamBGames: 4, winnerTeam: "B" as const };
      const points = calculateMatchPoints(result);

      expect(points.teamAPointsPerPlayer).toBe(1); // 1 + 0 bonus
      expect(points.teamBPointsPerPlayer).toBe(5); // 4 + 1 bonus
    });
  });

  describe("calculateStandings", () => {
    const players = new Map([
      [1, "Alice"],
      [2, "Bob"],
      [3, "Charlie"],
      [4, "Dave"],
      [5, "Eve"],
    ]);

    it("should initialize all players with zero stats when no matches played", () => {
      const standings = calculateStandings([], players);

      expect(standings).toHaveLength(5);
      standings.forEach((stat) => {
        expect(stat.matchesPlayed).toBe(0);
        expect(stat.wins).toBe(0);
        expect(stat.losses).toBe(0);
        expect(stat.points).toBe(0);
        expect(stat.gamesFor).toBe(0);
        expect(stat.gamesAgainst).toBe(0);
      });
    });

    it("should calculate stats for a single completed match (4-0)", () => {
      const matches: MatchWithPlayers[] = [
        {
          id: 1,
          teamAPlayer1Id: 1,
          teamAPlayer2Id: 2,
          teamBPlayer1Id: 3,
          teamBPlayer2Id: 4,
          sitOutPlayerId: 5,
          teamAGames: 4,
          teamBGames: 0,
          winnerTeam: "A",
        },
      ];

      const standings = calculateStandings(matches, players);

      // Alice (Player 1) - Team A winner
      const alice = standings.find((s) => s.playerId === 1)!;
      expect(alice.matchesPlayed).toBe(1);
      expect(alice.wins).toBe(1);
      expect(alice.losses).toBe(0);
      expect(alice.gamesFor).toBe(4);
      expect(alice.gamesAgainst).toBe(0);
      expect(alice.points).toBe(5); // 4 + 1 bonus

      // Bob (Player 2) - Team A winner
      const bob = standings.find((s) => s.playerId === 2)!;
      expect(bob.matchesPlayed).toBe(1);
      expect(bob.wins).toBe(1);
      expect(bob.points).toBe(5);

      // Charlie (Player 3) - Team B loser
      const charlie = standings.find((s) => s.playerId === 3)!;
      expect(charlie.matchesPlayed).toBe(1);
      expect(charlie.wins).toBe(0);
      expect(charlie.losses).toBe(1);
      expect(charlie.gamesFor).toBe(0);
      expect(charlie.gamesAgainst).toBe(4);
      expect(charlie.points).toBe(0);

      // Eve (Player 5) - sat out
      const eve = standings.find((s) => s.playerId === 5)!;
      expect(eve.matchesPlayed).toBe(0);
      expect(eve.points).toBe(0);
    });

    it("should calculate stats for close match (4-3)", () => {
      const matches: MatchWithPlayers[] = [
        {
          id: 1,
          teamAPlayer1Id: 1,
          teamAPlayer2Id: 2,
          teamBPlayer1Id: 3,
          teamBPlayer2Id: 4,
          sitOutPlayerId: 5,
          teamAGames: 4,
          teamBGames: 3,
          winnerTeam: "A",
        },
      ];

      const standings = calculateStandings(matches, players);

      const alice = standings.find((s) => s.playerId === 1)!;
      expect(alice.points).toBe(5); // 4 + 1 bonus

      const charlie = standings.find((s) => s.playerId === 3)!;
      expect(charlie.points).toBe(3); // 3 + 0 bonus
      expect(charlie.losses).toBe(1);
    });

    it("should aggregate stats across multiple matches", () => {
      const matches: MatchWithPlayers[] = [
        {
          id: 1,
          teamAPlayer1Id: 1,
          teamAPlayer2Id: 2,
          teamBPlayer1Id: 3,
          teamBPlayer2Id: 4,
          sitOutPlayerId: 5,
          teamAGames: 4,
          teamBGames: 2,
          winnerTeam: "A",
        },
        {
          id: 2,
          teamAPlayer1Id: 1,
          teamAPlayer2Id: 3,
          teamBPlayer1Id: 2,
          teamBPlayer2Id: 4,
          sitOutPlayerId: 5,
          teamAGames: 1,
          teamBGames: 4,
          winnerTeam: "B",
        },
      ];

      const standings = calculateStandings(matches, players);

      // Alice played 2 matches: won first (5 points), lost second (1 point)
      const alice = standings.find((s) => s.playerId === 1)!;
      expect(alice.matchesPlayed).toBe(2);
      expect(alice.wins).toBe(1);
      expect(alice.losses).toBe(1);
      expect(alice.points).toBe(6); // 5 + 1
      expect(alice.gamesFor).toBe(5); // 4 + 1
      expect(alice.gamesAgainst).toBe(6); // 2 + 4
    });

    it("should skip matches without results", () => {
      const matches: MatchWithPlayers[] = [
        {
          id: 1,
          teamAPlayer1Id: 1,
          teamAPlayer2Id: 2,
          teamBPlayer1Id: 3,
          teamBPlayer2Id: 4,
          sitOutPlayerId: 5,
          teamAGames: null,
          teamBGames: null,
          winnerTeam: null,
        },
      ];

      const standings = calculateStandings(matches, players);

      standings.forEach((stat) => {
        expect(stat.matchesPlayed).toBe(0);
        expect(stat.points).toBe(0);
      });
    });

    it("should sort standings by points descending", () => {
      const matches: MatchWithPlayers[] = [
        {
          id: 1,
          teamAPlayer1Id: 1,
          teamAPlayer2Id: 2,
          teamBPlayer1Id: 3,
          teamBPlayer2Id: 4,
          sitOutPlayerId: 5,
          teamAGames: 4,
          teamBGames: 0,
          winnerTeam: "A",
        },
        {
          id: 2,
          teamAPlayer1Id: 3,
          teamAPlayer2Id: 5,
          teamBPlayer1Id: 1,
          teamBPlayer2Id: 2,
          sitOutPlayerId: 4,
          teamAGames: 4,
          teamBGames: 2,
          winnerTeam: "A",
        },
      ];

      const standings = calculateStandings(matches, players);

      // Players 1 and 2: 5 + 2 = 7 points each
      // Players 3 and 5: 0 + 5 = 5 points each
      // Player 4: 0 points

      expect(standings[0].points).toBeGreaterThanOrEqual(standings[1].points);
      expect(standings[1].points).toBeGreaterThanOrEqual(standings[2].points);
      expect(standings[2].points).toBeGreaterThanOrEqual(standings[3].points);
      expect(standings[3].points).toBeGreaterThanOrEqual(standings[4].points);
    });
  });
});

describe("Americano scoring", () => {
  describe("validateScore (americano)", () => {
    it("should accept scores that sum to 32", () => {
      expect(validateScore(20, 12, "americano")).toBe(true);
      expect(validateScore(16, 16, "americano")).toBe(true);
      expect(validateScore(32, 0, "americano")).toBe(true);
      expect(validateScore(0, 32, "americano")).toBe(true);
      expect(validateScore(17, 15, "americano")).toBe(true);
    });

    it("should reject scores that do not sum to 32", () => {
      expect(validateScore(4, 0, "americano")).toBe(false);
      expect(validateScore(20, 11, "americano")).toBe(false);
      expect(validateScore(0, 0, "americano")).toBe(false);
    });

    it("should reject negative scores", () => {
      expect(validateScore(-1, 33, "americano")).toBe(false);
    });
  });

  describe("parseMatchResult (americano)", () => {
    it("should return winner A when A > B and sum is 32", () => {
      const result = parseMatchResult(20, 12, "americano");
      expect(result).toEqual({ teamAGames: 20, teamBGames: 12, winnerTeam: "A" });
    });

    it("should return winner B when B > A and sum is 32", () => {
      const result = parseMatchResult(8, 24, "americano");
      expect(result).toEqual({ teamAGames: 8, teamBGames: 24, winnerTeam: "B" });
    });

    it("should return DRAW when scores are equal (16-16)", () => {
      const result = parseMatchResult(16, 16, "americano");
      expect(result).toEqual({ teamAGames: 16, teamBGames: 16, winnerTeam: "DRAW" });
    });

    it("should return null for invalid americano scores", () => {
      expect(parseMatchResult(4, 2, "americano")).toBeNull();
      expect(parseMatchResult(20, 11, "americano")).toBeNull();
    });
  });

  describe("calculatePlayerPoints (americano)", () => {
    it("should return exactly the games scored, no win bonus", () => {
      expect(calculatePlayerPoints(20, true, "americano")).toBe(20);
      expect(calculatePlayerPoints(12, false, "americano")).toBe(12);
      expect(calculatePlayerPoints(16, true, "americano")).toBe(16);
      expect(calculatePlayerPoints(16, false, "americano")).toBe(16);
    });
  });

  describe("calculateMatchPoints (americano)", () => {
    it("should assign scores directly for a 20-12 match", () => {
      const result = { teamAGames: 20, teamBGames: 12, winnerTeam: "A" as const };
      const points = calculateMatchPoints(result, "americano");
      expect(points.teamAPointsPerPlayer).toBe(20);
      expect(points.teamBPointsPerPlayer).toBe(12);
    });

    it("should assign 16 each for a 16-16 draw", () => {
      const result = { teamAGames: 16, teamBGames: 16, winnerTeam: "DRAW" as const };
      const points = calculateMatchPoints(result, "americano");
      expect(points.teamAPointsPerPlayer).toBe(16);
      expect(points.teamBPointsPerPlayer).toBe(16);
    });
  });

  describe("calculateStandings (americano)", () => {
    const players = new Map([
      [1, "Alice"],
      [2, "Bob"],
      [3, "Charlie"],
      [4, "Dan"],
    ]);

    function makeMatch(
      id: number,
      a1: number,
      a2: number,
      b1: number,
      b2: number,
      aGames: number,
      bGames: number,
      winner: string,
    ): MatchWithPlayers {
      return {
        id,
        teamAPlayer1Id: a1,
        teamAPlayer2Id: a2,
        teamBPlayer1Id: b1,
        teamBPlayer2Id: b2,
        sitOutPlayerId: null,
        teamAGames: aGames,
        teamBGames: bGames,
        winnerTeam: winner,
      };
    }

    it("should accumulate scores without win bonus", () => {
      const matches = [
        makeMatch(1, 1, 2, 3, 4, 20, 12, "A"),
      ];
      const standings = calculateStandings(matches, players, "americano");
      const alice = standings.find((s) => s.playerId === 1)!;
      const charlie = standings.find((s) => s.playerId === 3)!;
      expect(alice.points).toBe(20);
      expect(charlie.points).toBe(12);
      expect(alice.wins).toBe(1);
      expect(charlie.losses).toBe(1);
    });

    it("should record neither win nor loss for draws", () => {
      const matches = [
        makeMatch(1, 1, 2, 3, 4, 16, 16, "DRAW"),
      ];
      const standings = calculateStandings(matches, players, "americano");
      const alice = standings.find((s) => s.playerId === 1)!;
      const charlie = standings.find((s) => s.playerId === 3)!;
      expect(alice.points).toBe(16);
      expect(charlie.points).toBe(16);
      expect(alice.wins).toBe(0);
      expect(alice.losses).toBe(0);
      expect(charlie.wins).toBe(0);
      expect(charlie.losses).toBe(0);
    });
  });

  // Characterization test: locks the exact numbers a full Wednesday
  // (americano, 4 fixed pairs) round produces today, before the
  // League/Season/Round restructure touches this code path. If this
  // test's expected values ever need to change, the restructure changed
  // real scoring behavior, not just its plumbing.
  describe("Wednesday round characterization (americano, 4 fixed pairs)", () => {
    const players = new Map([
      [1, "P1a"],
      [2, "P1b"],
      [3, "P2a"],
      [4, "P2b"],
      [5, "P3a"],
      [6, "P3b"],
      [7, "P4a"],
      [8, "P4b"],
    ]);

    function makeMatch(
      id: number,
      a1: number,
      a2: number,
      b1: number,
      b2: number,
      aGames: number,
      bGames: number,
      winner: string,
    ): MatchWithPlayers {
      return {
        id,
        teamAPlayer1Id: a1,
        teamAPlayer2Id: a2,
        teamBPlayer1Id: b1,
        teamBPlayer2Id: b2,
        sitOutPlayerId: null,
        teamAGames: aGames,
        teamBGames: bGames,
        winnerTeam: winner,
      };
    }

    // Round-robin of 4 fixed pairs: (1,2) (3,4) (5,6) (7,8) — every pair
    // faces every other pair once, 2 draws included.
    const matches = [
      makeMatch(1, 1, 2, 3, 4, 20, 12, "A"), // P1 beats P2
      makeMatch(2, 5, 6, 7, 8, 16, 16, "DRAW"), // P3 draws P4
      makeMatch(3, 1, 2, 5, 6, 18, 14, "A"), // P1 beats P3
      makeMatch(4, 3, 4, 7, 8, 10, 22, "B"), // P4 beats P2
      makeMatch(5, 1, 2, 7, 8, 15, 17, "B"), // P4 beats P1
      makeMatch(6, 3, 4, 5, 6, 16, 16, "DRAW"), // P2 draws P3
    ];

    it("computes player standings matching hand-verified totals", () => {
      const standings = calculateStandings(matches, players, "americano");
      const byId = new Map(standings.map((s) => [s.playerId, s]));

      expect(byId.get(1)).toMatchObject({
        points: 53,
        wins: 2,
        losses: 1,
        matchesPlayed: 3,
        gamesFor: 53,
        gamesAgainst: 43,
      });
      expect(byId.get(3)).toMatchObject({
        points: 38,
        wins: 0,
        losses: 2,
        matchesPlayed: 3,
        gamesFor: 38,
        gamesAgainst: 58,
      });
      expect(byId.get(5)).toMatchObject({
        points: 46,
        wins: 0,
        losses: 1,
        matchesPlayed: 3,
        gamesFor: 46,
        gamesAgainst: 50,
      });
      expect(byId.get(7)).toMatchObject({
        points: 55,
        wins: 2,
        losses: 0,
        matchesPlayed: 3,
        gamesFor: 55,
        gamesAgainst: 41,
      });

      // Total points conserved: each match's 32 points are credited to
      // both players on each team (no bonus in americano), so every
      // match contributes 2x32=64 total across all 8 players.
      const totalPoints = standings.reduce((sum, s) => sum + s.points, 0);
      expect(totalPoints).toBe(6 * 64);

      // Ranking order: P4 > P1 > P3 > P2
      expect(standings.map((s) => s.playerId)).toEqual([7, 8, 1, 2, 5, 6, 3, 4]);
    });

    it("computes pair standings matching hand-verified totals and ranking", () => {
      const pairings = calculatePairingStats(matches, players, "americano");
      const byPair = new Map(
        pairings.map((p) => [`${p.player1Id}-${p.player2Id}`, p]),
      );

      expect(byPair.get("1-2")).toMatchObject({
        matchesPlayed: 3,
        wins: 2,
        losses: 1,
        gamesFor: 53,
        gamesAgainst: 43,
        winRate: 67,
      });
      expect(byPair.get("3-4")).toMatchObject({
        matchesPlayed: 3,
        wins: 0,
        losses: 2,
        gamesFor: 38,
        gamesAgainst: 58,
        winRate: 0,
      });
      expect(byPair.get("5-6")).toMatchObject({
        matchesPlayed: 3,
        wins: 0,
        losses: 1,
        gamesFor: 46,
        gamesAgainst: 50,
        winRate: 0,
      });
      expect(byPair.get("7-8")).toMatchObject({
        matchesPlayed: 3,
        wins: 2,
        losses: 0,
        gamesFor: 55,
        gamesAgainst: 41,
        winRate: 67,
      });

      // Ranking: winRate desc, then wins, then gamesFor -> P4, P1, P3, P2
      expect(pairings.map((p) => `${p.player1Id}-${p.player2Id}`)).toEqual([
        "7-8",
        "1-2",
        "5-6",
        "3-4",
      ]);
    });
  });
});

describe("Placement scoring (rotation formats)", () => {
  const players = new Map([
    [1, "Alice"],
    [2, "Bob"],
    [3, "Charlie"],
    [4, "Dave"],
    [5, "Eve"],
  ]);

  let nextId = 1;
  const match = (
    teamA: [number, number],
    teamB: [number, number],
    teamAGames: number,
    teamBGames: number,
    sitOutPlayerId: number | null = null,
  ): MatchWithPlayers => ({
    id: nextId++,
    teamAPlayer1Id: teamA[0],
    teamAPlayer2Id: teamA[1],
    teamBPlayer1Id: teamB[0],
    teamBPlayer2Id: teamB[1],
    sitOutPlayerId,
    teamAGames,
    teamBGames,
    winnerTeam: teamAGames > teamBGames ? "A" : "B",
  });

  // One full 5-player cycle. Standard points (games + win bonus):
  //   Bob 20 (4W), Alice 15, Charlie 13, Dave 10, Eve 10
  // Dave and Eve tie on the full sort key (10 pts, 1 win, 9 gamesFor).
  const fullCycle = (): MatchWithPlayers[] => [
    match([2, 5], [3, 4], 4, 2, 1),
    match([3, 1], [4, 5], 4, 1, 2),
    match([4, 2], [5, 1], 4, 3, 3),
    match([5, 3], [1, 2], 1, 4, 4),
    match([1, 4], [2, 3], 2, 4, 5),
  ];

  // A 4-player round (Eve absent): Alice 15, Bob 8, Dave 7, Charlie 6.
  const fourPlayerRound = (): MatchWithPlayers[] => [
    match([1, 2], [3, 4], 4, 0),
    match([1, 3], [2, 4], 4, 2),
    match([1, 4], [2, 3], 4, 1),
  ];

  describe("calculateRoundPlacements", () => {
    it("converts finishing position to points (1st = N participants … last = 1)", () => {
      const placements = calculateRoundPlacements(fullCycle(), players);

      expect(placements.map((p) => p.playerId)).toEqual([2, 1, 3, 4, 5]);
      expect(placements.map((p) => p.rank)).toEqual([1, 2, 3, 4, 4]);
      expect(placements.map((p) => p.placementPoints)).toEqual([5, 4, 3, 2, 2]);
    });

    it("fully tied players share the higher rank and its points", () => {
      const placements = calculateRoundPlacements(fullCycle(), players);
      const dave = placements.find((p) => p.playerId === 4)!;
      const eve = placements.find((p) => p.playerId === 5)!;

      expect(dave.rank).toBe(4);
      expect(eve.rank).toBe(4);
      expect(dave.placementPoints).toBe(2);
      expect(eve.placementPoints).toBe(2);
    });

    it("scales to the number of participants (4-player round: 1st = 4 pts)", () => {
      const placements = calculateRoundPlacements(fourPlayerRound(), players);

      expect(placements).toHaveLength(4);
      expect(placements.map((p) => p.playerId)).toEqual([1, 2, 4, 3]);
      expect(placements.map((p) => p.placementPoints)).toEqual([4, 3, 2, 1]);
      expect(placements.some((p) => p.playerId === 5)).toBe(false);
    });

    it("returns an empty list when no matches have results", () => {
      expect(calculateRoundPlacements([], players)).toEqual([]);
    });
  });

  describe("calculatePlacementStandings", () => {
    it("sums placement points across rounds; absentees earn nothing", () => {
      const standings = calculatePlacementStandings(
        [fullCycle(), fourPlayerRound()],
        players,
      );

      const byId = new Map(standings.map((s) => [s.playerId, s]));
      expect(byId.get(1)!.placementPoints).toBe(8); // 4 + 4
      expect(byId.get(2)!.placementPoints).toBe(8); // 5 + 3
      expect(byId.get(3)!.placementPoints).toBe(4); // 3 + 1
      expect(byId.get(4)!.placementPoints).toBe(4); // 2 + 2
      expect(byId.get(5)!.placementPoints).toBe(2); // 2 + absent

      expect(byId.get(1)!.roundsPlayed).toBe(2);
      expect(byId.get(5)!.roundsPlayed).toBe(1);
      expect(byId.get(1)!.firsts).toBe(1);
      expect(byId.get(2)!.firsts).toBe(1);
    });

    it("breaks placement-point ties by firsts, then wins, then gamesFor", () => {
      const standings = calculatePlacementStandings(
        [fullCycle(), fourPlayerRound()],
        players,
      );

      // Alice and Bob both have 8 pts, 1 first, 5 wins — Alice leads on
      // gamesFor (25 vs 23). Charlie and Dave both have 4 pts, 0 firsts —
      // Charlie leads on wins (3 vs 2).
      expect(standings.map((s) => s.playerId)).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns an empty table for no rounds", () => {
      expect(calculatePlacementStandings([], players)).toEqual([]);
    });
  });
});
