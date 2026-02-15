/**
 * Dev tool to verify schedule balance
 * Run with: npx tsx scripts/verify-schedule.ts
 */

import {
  generateSchedule,
  verifyScheduleBalance,
} from "../lib/schedule-generator";

console.log("🎾 Padel League Schedule Verification Tool\n");

const seasonLengths = [15, 30, 45, 60] as const;

for (const length of seasonLengths) {
  console.log(`\n📊 Testing ${length}-match season:`);
  console.log("─".repeat(50));

  const schedule = generateSchedule(length);
  const verification = verifyScheduleBalance(schedule);

  console.log(`✓ Generated ${schedule.length} matches`);

  // Teammate pair analysis
  const pairCounts = Array.from(verification.teammatePairCounts.entries());
  const pairCountValues = pairCounts.map(([_, count]) => count);
  const uniquePairs = pairCounts.length;
  const expectedPairsPerMatch = 3 * (length / 15); // 3 times per 15 matches

  console.log(`✓ Found ${uniquePairs} unique teammate pairs`);
  console.log(`✓ Each pair appears ${expectedPairsPerMatch} times`);

  // Check if all counts are equal
  const allEqual = pairCountValues.every((c) => c === expectedPairsPerMatch);
  if (allEqual) {
    console.log("✅ Teammate pairing: BALANCED");
  } else {
    console.log("❌ Teammate pairing: NOT BALANCED");
    console.log("Counts:", pairCountValues);
  }

  // Opponent balance analysis
  let allOpponentBalanced = true;
  for (const [pair, opponents] of verification.opponentPairCounts) {
    const opponentCounts = Array.from(opponents.values());
    const firstCount = opponentCounts[0];
    const balanced = opponentCounts.every((c) => c === firstCount);

    if (!balanced) {
      console.log(`❌ Opponent balance violated for pair ${pair}`);
      allOpponentBalanced = false;
    }
  }

  if (allOpponentBalanced) {
    console.log("✅ Opponent matchups: BALANCED");
  }

  // Overall result
  if (verification.isBalanced) {
    console.log("\n🏆 Overall: PERFECTLY BALANCED");
  } else {
    console.log("\n⚠️  Overall: ISSUES DETECTED");
    verification.issues.forEach((issue) => console.log(`   - ${issue}`));
  }
}

console.log("\n" + "=".repeat(50));
console.log("✨ Verification complete!\n");
