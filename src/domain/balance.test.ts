import { describe, expect, it } from "vitest";
import { computeBalance, formatPercentChange, percentChange } from "./balance";

describe("computeBalance", () => {
  it("adds income and transfers in, subtracts expenses and transfers out", () => {
    expect(
      computeBalance({
        initialCents: 1000,
        incomeCents: 500,
        expenseCents: 200,
        transferOutCents: 100,
        transferInCents: 50,
      }),
    ).toBe(1250);
  });
});

describe("percentChange", () => {
  it("computes change rounded to one decimal", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(1, 3)).toBe(-66.7);
  });

  it("returns null when the previous value is zero", () => {
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("formatPercentChange", () => {
  it("formats with sign and pt-BR decimal comma", () => {
    expect(formatPercentChange(null)).toBe("—");
    expect(formatPercentChange(12.5)).toBe("+12,5%");
    expect(formatPercentChange(-3)).toBe("-3,0%");
    expect(formatPercentChange(0)).toBe("0,0%");
  });
});
