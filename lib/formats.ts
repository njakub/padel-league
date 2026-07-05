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
import {
  generateCycleSchedule,
  mapToPlayerIds,
} from "@/lib/schedule-generator";

export type FormatId = "americano-pairs" | "rotation-5";

/** How a round's roster is assembled in the create-round UI. */
export type RosterSpec =
  | { kind: "pick-pairs"; size: 8 }
  | { kind: "pick-players"; size: number };

/** Union of per-format schedule inputs; each format reads the field it needs. */
export interface ScheduleInput {
  pairs?: FixedPairs;
  playerIds?: number[];
}

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
  roster: RosterSpec;
  roundLengths: number[];
  /** Rounds per season; null = no season layer (rolling). */
  seasonRounds: number | null;
  /**
   * How rounds aggregate into season/all-time tables:
   *   "cumulative" — sum every match's points across rounds
   *   "placement"  — each completed round's finishing position converts to
   *                  league points (N participants: 1st = N … last = 1)
   */
  seasonScoring: "cumulative" | "placement";
  hasSitOut: boolean;
  /** Dual-written to Round.leagueType so old code paths keep working. */
  legacyLeagueType: "SUNDAY" | "WEDNESDAY" | "ADHOC";
  buildSchedule(totalMatches: number, input: ScheduleInput): RoundMatchRow[];
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
    seasonScoring: "cumulative",
    hasSitOut: false,
    legacyLeagueType: "WEDNESDAY",
    buildSchedule(totalMatches, { pairs }) {
      if (!pairs) {
        throw new Error('Format "americano-pairs" requires fixed pairs');
      }
      if (![6, 12, 18, 24].includes(totalMatches)) {
        throw new Error("Total matches must be 6, 12, 18, or 24");
      }
      const schedule = generateSchedulePairs(
        totalMatches as 6 | 12 | 18 | 24,
      );
      return mapToPlayerIdsPairs(schedule, pairs);
    },
  },
  // Sunday sessions: 5 players, 1 court, 5 matches of first-to-4 games.
  // Each session everyone sits out once and partners everyone once, so
  // every round is a fair, self-contained mini-Americano; the season table
  // is placement points (1st = 5 … 5th = 1, absent = 0) over 6 rounds.
  "rotation-5": {
    id: "rotation-5",
    label: "Rotation (5 players)",
    scoringStyle: "standard",
    roundStandings: "players",
    roster: { kind: "pick-players", size: 5 },
    roundLengths: [5, 10],
    seasonRounds: 6,
    seasonScoring: "placement",
    hasSitOut: true,
    legacyLeagueType: "SUNDAY",
    buildSchedule(totalMatches, { playerIds }) {
      if (!playerIds) {
        throw new Error('Format "rotation-5" requires playerIds');
      }
      const schedule = generateCycleSchedule(totalMatches as 5 | 10);
      return mapToPlayerIds(schedule, playerIds);
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
