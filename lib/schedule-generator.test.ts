import { describe, it, expect } from "vitest";
import {
  generateSchedule,
  generateCycleSchedule,
  verifyScheduleBalance,
  mapToPlayerIds,
} from "./schedule-generator";

describe("Schedule Generator", () => {
  describe("generateSchedule", () => {
    it("should generate 15 matches for a 15-match season", () => {
      const schedule = generateSchedule(15);
      expect(schedule).toHaveLength(15);
    });

    it("should generate 30 matches for a 30-match season", () => {
      const schedule = generateSchedule(30);
      expect(schedule).toHaveLength(30);
    });

    it("should generate 45 matches for a 45-match season", () => {
      const schedule = generateSchedule(45);
      expect(schedule).toHaveLength(45);
    });

    it("should generate 60 matches for a 60-match season", () => {
      const schedule = generateSchedule(60);
      expect(schedule).toHaveLength(60);
    });

    it("should throw error for invalid season length", () => {
      expect(() => generateSchedule(20 as any)).toThrow();
    });

    it("should have sequential match numbers", () => {
      const schedule = generateSchedule(15);
      schedule.forEach((match, index) => {
        expect(match.matchNumber).toBe(index + 1);
      });
    });

    it("should use all 5 players in each match (4 playing + 1 sit-out)", () => {
      const schedule = generateSchedule(15);

      for (const match of schedule) {
        const allPlayers = [
          match.sitOut,
          match.teamA[0],
          match.teamA[1],
          match.teamB[0],
          match.teamB[1],
        ];

        // Check all 5 players are present
        const uniquePlayers = new Set(allPlayers);
        expect(uniquePlayers.size).toBe(5);
        expect(uniquePlayers).toEqual(new Set([0, 1, 2, 3, 4]));
      }
    });
  });

  describe("verifyScheduleBalance", () => {
    it("should verify 15-match schedule is balanced", () => {
      const schedule = generateSchedule(15);
      const verification = verifyScheduleBalance(schedule);

      expect(verification.isBalanced).toBe(true);
      expect(verification.issues).toHaveLength(0);
    });

    it("should verify 30-match schedule is balanced", () => {
      const schedule = generateSchedule(30);
      const verification = verifyScheduleBalance(schedule);

      expect(verification.isBalanced).toBe(true);
      expect(verification.issues).toHaveLength(0);
    });

    it("should have equal teammate pair counts for 15-match season", () => {
      const schedule = generateSchedule(15);
      const verification = verifyScheduleBalance(schedule);

      const counts = Array.from(verification.teammatePairCounts.values());
      const firstCount = counts[0];

      // All 10 pairs should appear the same number of times
      expect(counts).toHaveLength(10); // C(5,2) = 10 possible pairs
      expect(counts.every((c) => c === firstCount)).toBe(true);

      // For 15 matches with 4 players per match (2 pairs), we have 30 pair instances
      // Distributed equally among 10 pairs = 3 times each
      expect(firstCount).toBe(3);
    });

    it("should have equal teammate pair counts for 30-match season", () => {
      const schedule = generateSchedule(30);
      const verification = verifyScheduleBalance(schedule);

      const counts = Array.from(verification.teammatePairCounts.values());
      const firstCount = counts[0];

      expect(counts).toHaveLength(10);
      expect(counts.every((c) => c === firstCount)).toBe(true);
      expect(firstCount).toBe(6); // 3 times × 2 repetitions
    });

    it("should have balanced opponent matchups for each teammate pair", () => {
      const schedule = generateSchedule(15);
      const verification = verifyScheduleBalance(schedule);

      // For each teammate pair, check opponent distribution
      Array.from(verification.opponentPairCounts.entries()).forEach(([pair, opponents]) => {
        const opponentCounts = Array.from(opponents.values());
        const firstOpponentCount = opponentCounts[0];

        // Each teammate pair should face each opponent pair the same number of times
        expect(opponentCounts.every((c) => c === firstOpponentCount)).toBe(
          true,
        );

        // For a teammate pair appearing 3 times, facing 3 different opponent pairs
        expect(opponentCounts).toHaveLength(3);
        expect(firstOpponentCount).toBe(1);
      });
    });

    it("should verify each sit-out appears 3 times in 15 matches", () => {
      const schedule = generateSchedule(15);
      const sitOutCounts = new Map<number, number>();

      for (const match of schedule) {
        sitOutCounts.set(
          match.sitOut,
          (sitOutCounts.get(match.sitOut) || 0) + 1,
        );
      }

      expect(sitOutCounts.size).toBe(5);
      Array.from(sitOutCounts.values()).forEach((count) => {
        expect(count).toBe(3);
      });
    });
  });

  describe("mapToPlayerIds", () => {
    it("should map player indices to player IDs", () => {
      const schedule = generateSchedule(15);
      const playerIds = [10, 20, 30, 40, 50];

      const mapped = mapToPlayerIds(schedule, playerIds);

      expect(mapped).toHaveLength(15);

      // Check first match
      const firstMatch = mapped[0];
      expect(firstMatch).toHaveProperty("matchNumber");
      expect(firstMatch).toHaveProperty("sitOutPlayerId");
      expect(firstMatch).toHaveProperty("teamAPlayer1Id");
      expect(firstMatch).toHaveProperty("teamAPlayer2Id");
      expect(firstMatch).toHaveProperty("teamBPlayer1Id");
      expect(firstMatch).toHaveProperty("teamBPlayer2Id");

      // Verify all IDs are from the provided player IDs
      for (const match of mapped) {
        expect(playerIds).toContain(match.sitOutPlayerId);
        expect(playerIds).toContain(match.teamAPlayer1Id);
        expect(playerIds).toContain(match.teamAPlayer2Id);
        expect(playerIds).toContain(match.teamBPlayer1Id);
        expect(playerIds).toContain(match.teamBPlayer2Id);
      }
    });

    it("should throw error if not exactly 5 player IDs provided", () => {
      const schedule = generateSchedule(15);

      expect(() => mapToPlayerIds(schedule, [1, 2, 3, 4])).toThrow();
      expect(() => mapToPlayerIds(schedule, [1, 2, 3, 4, 5, 6])).toThrow();
    });
  });

  describe("generateCycleSchedule (5-player single session)", () => {
    const pairKey = (a: number, b: number) =>
      a < b ? `${a}-${b}` : `${b}-${a}`;

    it("generates 5 matches with contiguous match numbers", () => {
      const cycle = generateCycleSchedule(5);
      expect(cycle).toHaveLength(5);
      cycle.forEach((m, i) => expect(m.matchNumber).toBe(i + 1));
    });

    it("throws for lengths other than 5 or 10", () => {
      expect(() => generateCycleSchedule(15 as unknown as 5)).toThrow();
      expect(() => generateCycleSchedule(4 as unknown as 5)).toThrow();
    });

    it("every player sits out exactly once", () => {
      const sitOuts = generateCycleSchedule(5).map((m) => m.sitOut);
      expect([...sitOuts].sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it("the sit-out player is never on court in their match", () => {
      for (const m of generateCycleSchedule(5)) {
        expect([...m.teamA, ...m.teamB]).not.toContain(m.sitOut);
        expect(new Set([...m.teamA, ...m.teamB]).size).toBe(4);
      }
    });

    it("every pair of players partners exactly once (all 10 pairs)", () => {
      const counts = new Map<string, number>();
      for (const m of generateCycleSchedule(5)) {
        counts.set(pairKey(...m.teamA), (counts.get(pairKey(...m.teamA)) ?? 0) + 1);
        counts.set(pairKey(...m.teamB), (counts.get(pairKey(...m.teamB)) ?? 0) + 1);
      }
      expect(counts.size).toBe(10);
      for (const count of counts.values()) expect(count).toBe(1);
    });

    it("every player faces every other player exactly twice", () => {
      const counts = new Map<string, number>();
      for (const m of generateCycleSchedule(5)) {
        for (const a of m.teamA) {
          for (const b of m.teamB) {
            counts.set(pairKey(a, b), (counts.get(pairKey(a, b)) ?? 0) + 1);
          }
        }
      }
      expect(counts.size).toBe(10);
      for (const count of counts.values()) expect(count).toBe(2);
    });

    it("10-match variant repeats the cycle with continued numbering", () => {
      const double = generateCycleSchedule(10);
      expect(double).toHaveLength(10);
      double.forEach((m, i) => expect(m.matchNumber).toBe(i + 1));

      const counts = new Map<string, number>();
      for (const m of double) {
        counts.set(pairKey(...m.teamA), (counts.get(pairKey(...m.teamA)) ?? 0) + 1);
        counts.set(pairKey(...m.teamB), (counts.get(pairKey(...m.teamB)) ?? 0) + 1);
      }
      expect(counts.size).toBe(10);
      for (const count of counts.values()) expect(count).toBe(2);
    });

    it("passes the generic balance verifier", () => {
      const { isBalanced, issues } = verifyScheduleBalance(
        generateCycleSchedule(5),
      );
      expect(issues).toEqual([]);
      expect(isBalanced).toBe(true);
    });

    it("maps to player IDs via mapToPlayerIds", () => {
      const mapped = mapToPlayerIds(generateCycleSchedule(5), [10, 20, 30, 40, 50]);
      expect(mapped).toHaveLength(5);
      const sitOuts = mapped.map((m) => m.sitOutPlayerId).sort((a, b) => a - b);
      expect(sitOuts).toEqual([10, 20, 30, 40, 50]);
    });
  });
});
