import { describe, it, expect } from "vitest";
import { FORMATS, getFormat } from "./formats";

describe("format registry", () => {
  it("every entry has a valid scoringStyle and roundStandings kind", () => {
    for (const format of Object.values(FORMATS)) {
      expect(["standard", "americano"]).toContain(format.scoringStyle);
      expect(["pairs", "players"]).toContain(format.roundStandings);
      expect(["cumulative", "placement"]).toContain(format.seasonScoring);
      expect(format.roundLengths.length).toBeGreaterThan(0);
    }
  });

  it("getFormat resolves a known id", () => {
    const format = getFormat("americano-pairs");
    expect(format.id).toBe("americano-pairs");
    expect(format.legacyLeagueType).toBe("WEDNESDAY");
  });

  it("getFormat throws on an unknown id", () => {
    expect(() => getFormat("nonsense")).toThrow(/Unknown format/);
  });

  describe("americano-pairs.buildSchedule", () => {
    const pairs: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ] = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];

    it("accepts every advertised round length", () => {
      const format = getFormat("americano-pairs");
      for (const length of format.roundLengths) {
        const rows = format.buildSchedule(length, { pairs });
        expect(rows).toHaveLength(length);
      }
    });

    it("rejects a length outside the advertised set", () => {
      const format = getFormat("americano-pairs");
      expect(() => format.buildSchedule(7, { pairs })).toThrow();
    });

    it("produces contiguous match numbers with no sit-out (hasSitOut: false)", () => {
      const format = getFormat("americano-pairs");
      const rows = format.buildSchedule(6, { pairs });
      rows.forEach((row, index) => {
        expect(row.matchNumber).toBe(index + 1);
        expect(row.sitOutPlayerId).toBeUndefined();
      });
      expect(format.hasSitOut).toBe(false);
    });

    it("maps pair indices to the actual player ids passed in", () => {
      const format = getFormat("americano-pairs");
      const rows = format.buildSchedule(6, { pairs });
      const allPlayerIds = new Set(
        rows.flatMap((r) => [
          r.teamAPlayer1Id,
          r.teamAPlayer2Id,
          r.teamBPlayer1Id,
          r.teamBPlayer2Id,
        ]),
      );
      expect(allPlayerIds).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    });

    it("throws when pairs are missing", () => {
      const format = getFormat("americano-pairs");
      expect(() => format.buildSchedule(6, {})).toThrow(/pairs/);
    });
  });

  describe("rotation-5.buildSchedule", () => {
    const playerIds = [11, 22, 33, 44, 55];

    it("accepts every advertised round length", () => {
      const format = getFormat("rotation-5");
      for (const length of format.roundLengths) {
        const rows = format.buildSchedule(length, { playerIds });
        expect(rows).toHaveLength(length);
      }
    });

    it("rejects a length outside the advertised set", () => {
      const format = getFormat("rotation-5");
      expect(() => format.buildSchedule(15, { playerIds })).toThrow();
    });

    it("throws when playerIds are missing", () => {
      const format = getFormat("rotation-5");
      expect(() => format.buildSchedule(5, {})).toThrow(/playerIds/);
    });

    it("every match has a sit-out and 4 distinct on-court players", () => {
      const format = getFormat("rotation-5");
      const rows = format.buildSchedule(5, { playerIds });
      expect(format.hasSitOut).toBe(true);
      for (const row of rows) {
        const onCourt = [
          row.teamAPlayer1Id,
          row.teamAPlayer2Id,
          row.teamBPlayer1Id,
          row.teamBPlayer2Id,
        ];
        expect(row.sitOutPlayerId).toBeDefined();
        expect(new Set(onCourt).size).toBe(4);
        expect(onCourt).not.toContain(row.sitOutPlayerId);
      }
    });

    it("each player sits out once and partners everyone exactly once", () => {
      const format = getFormat("rotation-5");
      const rows = format.buildSchedule(5, { playerIds });

      const sitOuts = rows.map((r) => r.sitOutPlayerId!).sort((a, b) => a - b);
      expect(sitOuts).toEqual([11, 22, 33, 44, 55]);

      const pairKey = (a: number, b: number) =>
        a < b ? `${a}-${b}` : `${b}-${a}`;
      const partnerships = new Set<string>();
      for (const r of rows) {
        partnerships.add(pairKey(r.teamAPlayer1Id, r.teamAPlayer2Id));
        partnerships.add(pairKey(r.teamBPlayer1Id, r.teamBPlayer2Id));
      }
      expect(partnerships.size).toBe(10); // all C(5,2) pairs, no repeats
    });
  });
});
