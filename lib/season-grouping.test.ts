import { describe, it, expect } from "vitest";
import { groupRoundsIntoSeasons, type RoundLike } from "./season-grouping";

function round(id: number, status: string, daysAgo: number): RoundLike {
  // Larger daysAgo = created earlier.
  const createdAt = new Date(2026, 0, 100 - daysAgo);
  return { id, status, createdAt };
}

describe("groupRoundsIntoSeasons", () => {
  it("returns no groups for zero rounds", () => {
    expect(groupRoundsIntoSeasons([], 7)).toEqual([]);
  });

  it("groups a trailing partial chunk as ACTIVE (3 of 7)", () => {
    const rounds = [
      round(1, "COMPLETED", 3),
      round(2, "COMPLETED", 2),
      round(3, "ACTIVE", 1),
    ];
    const groups = groupRoundsIntoSeasons(rounds, 7);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      number: 1,
      status: "ACTIVE",
      completedAt: null,
    });
    expect(groups[0].rounds).toEqual([
      { roundId: 1, roundNumber: 1 },
      { roundId: 2, roundNumber: 2 },
      { roundId: 3, roundNumber: 3 },
    ]);
  });

  it("marks a full, all-completed group of 7 as COMPLETED", () => {
    const rounds = Array.from({ length: 7 }, (_, i) =>
      round(i + 1, "COMPLETED", 7 - i),
    );
    const groups = groupRoundsIntoSeasons(rounds, 7);
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe("COMPLETED");
    expect(groups[0].completedAt).toEqual(rounds[6].createdAt);
    expect(groups[0].rounds.map((r) => r.roundNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("keeps a full group ACTIVE if any round in it is still ACTIVE", () => {
    const rounds = [
      ...Array.from({ length: 6 }, (_, i) => round(i + 1, "COMPLETED", 7 - i)),
      round(7, "ACTIVE", 1),
    ];
    const groups = groupRoundsIntoSeasons(rounds, 7);
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe("ACTIVE");
    expect(groups[0].completedAt).toBeNull();
  });

  it("splits 8 rounds into a completed season 1 and an active season 2 with 1 round", () => {
    const completed7 = Array.from({ length: 7 }, (_, i) =>
      round(i + 1, "COMPLETED", 8 - i),
    );
    const trailing = round(8, "ACTIVE", 1);
    const groups = groupRoundsIntoSeasons([...completed7, trailing], 7);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ number: 1, status: "COMPLETED" });
    expect(groups[0].rounds).toHaveLength(7);
    expect(groups[1]).toMatchObject({ number: 2, status: "ACTIVE" });
    expect(groups[1].rounds).toEqual([{ roundId: 8, roundNumber: 1 }]);
  });

  it("splits 14 rounds into two completed seasons", () => {
    const rounds = Array.from({ length: 14 }, (_, i) =>
      round(i + 1, "COMPLETED", 14 - i),
    );
    const groups = groupRoundsIntoSeasons(rounds, 7);
    expect(groups).toHaveLength(2);
    expect(groups[0].status).toBe("COMPLETED");
    expect(groups[1].status).toBe("COMPLETED");
    expect(groups[0].rounds.map((r) => r.roundId)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(groups[1].rounds.map((r) => r.roundId)).toEqual([
      8, 9, 10, 11, 12, 13, 14,
    ]);
  });

  it("splits 15 rounds into two completed seasons and a trailing 1-round active season", () => {
    const rounds = Array.from({ length: 15 }, (_, i) =>
      round(i + 1, i < 14 ? "COMPLETED" : "ACTIVE", 15 - i),
    );
    const groups = groupRoundsIntoSeasons(rounds, 7);
    expect(groups).toHaveLength(3);
    expect(groups[0].status).toBe("COMPLETED");
    expect(groups[1].status).toBe("COMPLETED");
    expect(groups[2]).toMatchObject({ number: 3, status: "ACTIVE" });
    expect(groups[2].rounds).toEqual([{ roundId: 15, roundNumber: 1 }]);
  });

  it("orders by createdAt regardless of input order, with id as tiebreak", () => {
    const rounds = [
      round(3, "COMPLETED", 1),
      round(1, "COMPLETED", 3),
      round(2, "COMPLETED", 2),
    ];
    const groups = groupRoundsIntoSeasons(rounds, 7);
    expect(groups[0].rounds.map((r) => r.roundId)).toEqual([1, 2, 3]);
  });
});
