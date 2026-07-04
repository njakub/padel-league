/**
 * Pure grouping logic for the backfill: chunks a league's historical rounds
 * (today's "Season" rows) into LeagueSeason groups of `roundsPerSeason`
 * (one full partner cycle), in creation order.
 *
 * A group is COMPLETED only if it is full (roundsPerSeason rounds) and every
 * round in it is COMPLETED — a full group containing a still-ACTIVE round,
 * or a trailing partial group, is the currently-open season.
 */

export interface RoundLike {
  id: number;
  status: string; // "ACTIVE" | "COMPLETED"
  createdAt: Date;
}

export interface SeasonGroup {
  number: number; // 1-based
  status: "ACTIVE" | "COMPLETED";
  completedAt: Date | null;
  rounds: { roundId: number; roundNumber: number }[]; // roundNumber is 1-based within the season
}

export function groupRoundsIntoSeasons(
  rounds: RoundLike[],
  roundsPerSeason: number,
): SeasonGroup[] {
  if (roundsPerSeason < 1) {
    throw new Error("roundsPerSeason must be at least 1");
  }

  const sorted = [...rounds].sort((a, b) => {
    const byDate = a.createdAt.getTime() - b.createdAt.getTime();
    return byDate !== 0 ? byDate : a.id - b.id;
  });

  const groups: SeasonGroup[] = [];
  for (let i = 0; i < sorted.length; i += roundsPerSeason) {
    const chunk = sorted.slice(i, i + roundsPerSeason);
    const isFull = chunk.length === roundsPerSeason;
    const allCompleted = chunk.every((r) => r.status === "COMPLETED");
    const isCompleted = isFull && allCompleted;

    groups.push({
      number: groups.length + 1,
      status: isCompleted ? "COMPLETED" : "ACTIVE",
      completedAt: isCompleted
        ? chunk[chunk.length - 1].createdAt
        : null,
      rounds: chunk.map((r, idx) => ({
        roundId: r.id,
        roundNumber: idx + 1,
      })),
    });
  }

  return groups;
}
