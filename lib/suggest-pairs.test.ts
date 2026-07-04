import { describe, it, expect } from "vitest";
import { suggestFixedPairs } from "./suggest-pairs";

const pairKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

describe("suggestFixedPairs", () => {
  const players = [1, 2, 3, 4, 5, 6, 7, 8];
  const emptyRankMap = new Map<number, number>();
  const emptyHistory = new Map<string, number>();

  it("returns 4 disjoint pairs covering all 8 players", () => {
    const pairs = suggestFixedPairs(players, emptyRankMap, emptyHistory);
    const allIds = pairs.flat();
    expect(new Set(allIds)).toEqual(new Set(players));
    expect(allIds).toHaveLength(8);
  });

  it("avoids a pair with prior history when an alternative exists", () => {
    const history = new Map([[pairKey(1, 2), 5]]);
    const pairs = suggestFixedPairs(players, emptyRankMap, history);
    const used = pairs.map(([a, b]) => pairKey(a, b));
    expect(used).not.toContain(pairKey(1, 2));
  });

  it("prefers pairing high and low ranks together for balance", () => {
    // Rank 1 (best) should end up with someone far from rank 1 when there's
    // no history penalty to fight against.
    const rankMap = new Map([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
      [6, 6],
      [7, 7],
      [8, 8],
    ]);
    const pairs = suggestFixedPairs(players, rankMap, emptyHistory);
    const pairContainingRank1 = pairs.find((p) => p.includes(1))!;
    const partnerOfRank1 = pairContainingRank1.find((id) => id !== 1)!;
    // Best balance pairs rank 1 with rank 8 (max spread); assert it's at
    // least paired with someone in the bottom half, not another top player.
    expect(partnerOfRank1).toBeGreaterThan(4);
  });

  describe("hardExcludePairs (season-aware)", () => {
    it("never returns a pair that's in the hard-exclude set", () => {
      const excluded = new Set([pairKey(1, 2), pairKey(3, 4)]);
      const pairs = suggestFixedPairs(
        players,
        emptyRankMap,
        emptyHistory,
        excluded,
      );
      const used = pairs.map(([a, b]) => pairKey(a, b));
      expect(used).not.toContain(pairKey(1, 2));
      expect(used).not.toContain(pairKey(3, 4));
    });

    it("falls back to the best-scored partition if the hard filter excludes everything", () => {
      // Exclude every possible pair among 8 players — no partition can
      // satisfy the hard constraint, so it must not throw or return null.
      const allPairs = new Set<string>();
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          allPairs.add(pairKey(players[i], players[j]));
        }
      }
      const pairs = suggestFixedPairs(
        players,
        emptyRankMap,
        emptyHistory,
        allPairs,
      );
      expect(pairs).toHaveLength(4);
      expect(new Set(pairs.flat())).toEqual(new Set(players));
    });

    it("can complete a full 7-round season with zero repeated partners (1-factorization guarantee)", () => {
      const used = new Set<string>();
      const rankMap = new Map<number, number>();
      for (let round = 0; round < 7; round++) {
        const pairs = suggestFixedPairs(players, rankMap, emptyHistory, used);
        const keys = pairs.map(([a, b]) => pairKey(a, b));

        // No repeat within this round's own result and none reused from before.
        for (const key of keys) {
          expect(used.has(key)).toBe(false);
          used.add(key);
        }
        // Every round must still cover all 8 players exactly once.
        expect(new Set(pairs.flat())).toEqual(new Set(players));
      }

      // After 7 rounds, all C(8,2) = 28 possible pairs have been used exactly once.
      expect(used.size).toBe(28);
    });
  });
});
