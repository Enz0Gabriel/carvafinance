import { describe, expect, it } from "vitest";
import {
  fromDbDate,
  isValidRange,
  listMonths,
  previousRange,
  resolvePreset,
  shiftRange,
  toDbDate,
} from "./period";

const today = new Date(2026, 10, 15);

describe("resolvePreset", () => {
  it("resolves every preset relative to today", () => {
    expect(resolvePreset("this-month", today)).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(resolvePreset("last-month", today)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(resolvePreset("last-3-months", today)).toEqual({
      from: "2026-09-01",
      to: "2026-11-30",
    });
    expect(resolvePreset("last-6-months", today)).toEqual({
      from: "2026-06-01",
      to: "2026-11-30",
    });
    expect(resolvePreset("this-year", today)).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });
});

describe("previousRange", () => {
  it("uses whole previous months for whole-month ranges", () => {
    expect(previousRange({ from: "2026-11-01", to: "2026-11-30" })).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(previousRange({ from: "2026-03-01", to: "2026-03-31" })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("uses the same number of days for arbitrary ranges", () => {
    expect(previousRange({ from: "2026-11-10", to: "2026-11-19" })).toEqual({
      from: "2026-10-31",
      to: "2026-11-09",
    });
  });
});

describe("shiftRange / listMonths / isValidRange", () => {
  it("shifts whole-month ranges", () => {
    expect(shiftRange({ from: "2026-11-01", to: "2026-11-30" }, -1)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  it("lists months covered by a range", () => {
    expect(listMonths({ from: "2026-09-15", to: "2026-11-02" })).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
  });

  it("rejects inverted or malformed ranges", () => {
    expect(isValidRange({ from: "2026-11-30", to: "2026-11-01" })).toBe(false);
    expect(isValidRange({ from: "2026-02-30", to: "2026-03-01" })).toBe(false);
    expect(isValidRange({ from: "2026-11-01", to: "2026-11-30" })).toBe(true);
  });
});

describe("db date conversion", () => {
  it("round-trips without timezone shift", () => {
    expect(fromDbDate(toDbDate("2026-11-30"))).toBe("2026-11-30");
    expect(toDbDate("2026-11-30").toISOString()).toBe(
      "2026-11-30T00:00:00.000Z",
    );
  });
});
