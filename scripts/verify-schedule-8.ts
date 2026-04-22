import { generateSchedule8 } from "../lib/schedule-generator-8";
const schedule = generateSchedule8(14);
const partnerCounts = new Map<string, number>();
for (const m of schedule) {
  const k1 = [...m.teamA].sort().join(",");
  const k2 = [...m.teamB].sort().join(",");
  partnerCounts.set(k1, (partnerCounts.get(k1) || 0) + 1);
  partnerCounts.set(k2, (partnerCounts.get(k2) || 0) + 1);
}
const counts = [...partnerCounts.values()];
console.log("Unique partner pairs:", partnerCounts.size, "/ expected: 28");
console.log(
  "All appear exactly once:",
  counts.every((c) => c === 1),
);
console.log("Total matches:", schedule.length);
for (let r = 1; r <= 7; r++) {
  const round = schedule.filter((m) => m.round === r);
  console.log(
    "Round",
    r,
    ":",
    round.map((m) => m.teamA.join("+") + " v " + m.teamB.join("+")).join(" | "),
  );
}
