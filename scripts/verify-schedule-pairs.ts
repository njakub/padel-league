import { generateSchedulePairs } from "../lib/schedule-generator-pairs";

const schedule = generateSchedulePairs(6);

const matchupCounts = new Map<string, number>();
for (const m of schedule) {
  const key = [m.pairA, m.pairB].sort().join(" vs ");
  matchupCounts.set(key, (matchupCounts.get(key) || 0) + 1);
}

const pairMatchCounts = new Map<number, number>();
for (const m of schedule) {
  pairMatchCounts.set(m.pairA, (pairMatchCounts.get(m.pairA) || 0) + 1);
  pairMatchCounts.set(m.pairB, (pairMatchCounts.get(m.pairB) || 0) + 1);
}

const vals = [...matchupCounts.values()];
console.log("=== Fixed-Pairs Schedule (6 matches base) ===");
console.log("Unique pair-vs-pair matchups:", matchupCounts.size, "/ expected: 6 (C(4,2))");
console.log("Each matchup appears exactly once:", vals.every((v) => v === 1));
console.log("Every pair plays exactly 3 matches:", [...pairMatchCounts.values()].every((v) => v === 3));
console.log("");
for (let r = 1; r <= 3; r++) {
  const round = schedule.filter((m) => m.round === r);
  console.log(`Round ${r}:`, round.map((m) => `P${m.pairA + 1} vs P${m.pairB + 1}`).join(" | "));
}
