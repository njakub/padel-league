import { generateSchedule8 } from "../lib/schedule-generator-8";

const schedule = generateSchedule8(14);

// Partner pair counts
const partnerCounts = new Map<string, number>();
for (const m of schedule) {
  const k1 = [...m.teamA].sort().join(",");
  const k2 = [...m.teamB].sort().join(",");
  partnerCounts.set(k1, (partnerCounts.get(k1) || 0) + 1);
  partnerCounts.set(k2, (partnerCounts.get(k2) || 0) + 1);
}

// Opponent pair counts: for each match, teamA faces teamB
const opponentCounts = new Map<string, number>();
for (const m of schedule) {
  const kA = [...m.teamA].sort().join(",");
  const kB = [...m.teamB].sort().join(",");
  const matchup = [kA, kB].sort().join(" vs ");
  opponentCounts.set(matchup, (opponentCounts.get(matchup) || 0) + 1);
}

// Per-player match count
const playerMatchCounts = new Map<number, number>();
for (const m of schedule) {
  for (const p of [...m.teamA, ...m.teamB]) {
    playerMatchCounts.set(p, (playerMatchCounts.get(p) || 0) + 1);
  }
}

const partnerCountVals = [...partnerCounts.values()];
const opponentCountVals = [...opponentCounts.values()];
const playerMatchVals = [...playerMatchCounts.values()];

console.log("=== 8-Player Schedule Balance Verification (14 matches) ===");
console.log("");
console.log("Partner pairs:");
console.log("  Unique pairs:", partnerCounts.size, "/ expected: 28 (C(8,2))");
console.log(
  "  Each appears exactly 1 time:",
  partnerCountVals.every((c) => c === 1),
);
console.log("");
console.log("Opponent matchups (pair-vs-pair):");
console.log("  Unique matchups:", opponentCounts.size);
console.log("  Min appearances:", Math.min(...opponentCountVals));
console.log("  Max appearances:", Math.max(...opponentCountVals));
console.log("");
console.log("Per-player matches played:");
console.log(
  "  All play exactly 7 matches:",
  playerMatchVals.every((c) => c === 7),
);
console.log("  Values:", playerMatchVals.join(", "));
