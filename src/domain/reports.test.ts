import { describe, expect, it } from "vitest";
import { fillMonths, withShares } from "./reports";

describe("fillMonths", () => {
  it("returns one row per month in order, zero-filling gaps", () => {
    expect(
      fillMonths(
        [{ month: "2026-10", incomeCents: 5, expenseCents: 1 }],
        ["2026-09", "2026-10"],
      ),
    ).toEqual([
      { month: "2026-09", incomeCents: 0, expenseCents: 0 },
      { month: "2026-10", incomeCents: 5, expenseCents: 1 },
    ]);
  });
});

describe("withShares", () => {
  it("adds percentage shares sorted by total descending", () => {
    expect(
      withShares([{ totalCents: 100 }, { totalCents: 300 }]).map(
        (r) => r.share,
      ),
    ).toEqual([75, 25]);
  });

  it("gives zero shares when everything is zero or empty", () => {
    expect(withShares([{ totalCents: 0 }])[0].share).toBe(0);
    expect(withShares([])).toEqual([]);
  });
});
