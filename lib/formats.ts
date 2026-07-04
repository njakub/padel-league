/**
 * Format registry — the single place that knows how each League plays.
 *
 * Client components never branch on a format id directly; they receive
 * resolved primitives (scoringStyle, roundStandings, hasSitOut, ...) as
 * props. Server code looks formats up via getFormat(league.format).
 */

import type { ScoringStyle } from "@/lib/scoring";
import type { FixedPairs } from "@/lib/suggest-pairs";
import {
  generateSchedulePairs,
  mapToPlayerIdsPairs,
} from "@/lib/schedule-generator-pairs";

export type FormatId = "americano-pairs";

export interface RoundMatchRow {
  matchNumber: number;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number;
  sitOutPlayerId?: number;
}

export interface FormatDescriptor {
  id: FormatId;
  label: string;
  scoringStyle: ScoringStyle;
  roundStandings: "pairs" | "players";
  roster: { kind: "pick-pairs"; size: 8 };
  roundLengths: number[];
  /** Rounds per season (a full partner cycle); null = no season layer (rolling). */
  seasonRounds: number | null;
  hasSitOut: boolean;
  /** Dual-written to Round.leagueType so old code paths keep working. */
  legacyLeagueType: "SUNDAY" | "WEDNESDAY" | "ADHOC";
  buildSchedule(
    totalMatches: number,
    input: { pairs: FixedPairs },
  ): RoundMatchRow[];
}

export const FORMATS: Record<FormatId, FormatDescriptor> = {
  "americano-pairs": {
    id: "americano-pairs",
    label: "Americano (fixed pairs)",
    scoringStyle: "americano",
    roundStandings: "pairs",
    roster: { kind: "pick-pairs", size: 8 },
    roundLengths: [6, 12, 18, 24],
    seasonRounds: 7,
    hasSitOut: false,
    legacyLeagueType: "WEDNESDAY",
    buildSchedule(totalMatches, { pairs }) {
      if (![6, 12, 18, 24].includes(totalMatches)) {
        throw new Error("Total matches must be 6, 12, 18, or 24");
      }
      const schedule = generateSchedulePairs(
        totalMatches as 6 | 12 | 18 | 24,
      );
      return mapToPlayerIdsPairs(schedule, pairs);
    },
  },
};

export function getFormat(id: string): FormatDescriptor {
  const format = FORMATS[id as FormatId];
  if (!format) {
    throw new Error(`Unknown format id: "${id}"`);
  }
  return format;
}
