import { describe, it, expect } from "vitest";
import { FORMATS, getFormat } from "./formats";

describe("format registry", () => {
  it("every entry has a valid scoringStyle and roundStandings kind", () => {
    for (const format of Object.values(FORMATS)) {
      expect(["standard", "americano"]).toContain(format.scoringStyle);
      expect(["pairs", "players"]).toContain(format.roundStandings);
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
  });
});
