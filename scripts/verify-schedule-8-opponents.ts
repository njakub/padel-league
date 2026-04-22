import { generateSchedule8 } from "../lib/schedule-generator-8";

const schedule = generateSchedule8(14);

// For each pair of players, count how many times they are OPPONENTS (same court, different teams)
const opponentEncounters = new Map<string, number>();
for (const m of schedule) {
  // Cross-product: each player on teamA vs each player on teamB
  for (const a of m.teamA) {
    for (const b of m.teamB) {
      const key = [a, b].sort().join(",");
      opponentEncounters.set(key, (opponentEncounters.get(key) || 0) + 1);
    }
  }
}

// For each specific partnership (A,B), list the opponent pairs they faced
const partnerOpponentCoverage = new Map<string, Set<string>>();
for (const m of schedule) {
  const pa = [...m.teamA].sort().join(",");
  const pb = [...m.teamB].sort().join(",");
  if (!partnerOpponentCoverage.has(pa))
    partnerOpponentCoverage.set(pa, new Set());
  if (!partnerOpponentCoverage.has(pb))
    partnerOpponentCoverage.set(pb, new Set());
  partnerOpponentCoverage.get(pa)!.add(pb);
  partnerOpponentCoverage.get(pb)!.add(pa);
}

const opponentCounts = [...opponentEncounters.values()];
const uniqueOpponentPairs = opponentEncounters.size;

// How many possible opponent pairs exist? C(8,2) = 28, same as partner pairs
// but "opponent" pairs = pairs of players who played against each other on the same court
console.log("=== Player-vs-Player Opponent Encounters ===");
console.log(
  "Unique opponent pairs:",
  uniqueOpponentPairs,
  "/ possible: 28 (C(8,2))",
);
console.log(
  "All pairs face each other as opponents:",
  opponentCounts.every((c) => c >= 1),
);
console.log(
  "Each pair faces each other exactly 2 times:",
  opponentCounts.every((c) => c === 2),
);
console.log(
  "Min:",
  Math.min(...opponentCounts),
  "Max:",
  Math.max(...opponentCounts),
);

console.log("\n=== Specific Pair-vs-Pair (same court) MatchUp Coverage ===");
const opponentPairMatchups = new Map<string, number>();
for (const m of schedule) {
  const kA = [...m.teamA].sort().join(",");
  const kB = [...m.teamB].sort().join(",");
  const key = [kA, kB].sort().join(" vs ");
  opponentPairMatchups.set(key, (opponentPairMatchups.get(key) || 0) + 1);
}
// Total possible pair-vs-pair matchups: C(8,2) * C(6,2) / 2 = 28 * 15 / 2 = 210
console.log(
  "Pair-vs-pair matchups that occurred:",
  opponentPairMatchups.size,
  "/ possible: 210",
);
console.log(
  "(Each partnership only teams up once, so can only face 1 specific opponent pair)",
);

console.log("\n=== Comparison: 5-player vs 8-player schedule ===");
console.log("5-player (15 matches):");
console.log("  - Each partnership appears: 3 times");
console.log("  - For each partnership, possible opponent pairs: C(3,2)=3");
console.log("  - Opponent pair coverage per partnership: 3/3 = 100%");
console.log("  - Opponent pairs covered per partnership: ALL of them");
console.log("");
console.log("8-player (14 matches):");
console.log("  - Each partnership appears: 1 time");
console.log("  - For each partnership, possible opponent pairs: C(6,2)=15");
console.log("  - Opponent pair coverage per partnership: 1/15 = 6.7%");
console.log("  - Every PLAYER faces every other PLAYER as opponent: 2 times ✓");
console.log("");
console.log(
  "To fully cover all pair-vs-pair matchups for 8 players would need:",
);
console.log(
  "  - 210 unique pair-vs-pair matchups / 2 per match = 105 matches minimum",
);
