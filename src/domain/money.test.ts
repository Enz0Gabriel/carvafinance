import { describe, it, expect } from "vitest";
import { parseMoneyInput, formatBRL, sumCents } from "./money";

describe("money domain", () => {
  it.each([
    ["1.234,56", 123456],
    ["0,5", 50],
    ["10", 1000],
    ["R$ 2,00", 200],
    [" 15,99 ", 1599],
    ["1234.56", 123456],
    ["1.234", 123400],
    ["0.50", 50],
  ])("parses %s to %i cents", (input, cents) => {
    expect(parseMoneyInput(input)).toBe(cents);
  });

  it.each(["abc", "", "0", "0,00", "-5", "1,234", "12,3456"])(
    "rejects %s",
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );

  it("formats", () => {
    expect(formatBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(formatBRL(-500).replace(/\s/g, " ")).toBe("-R$ 5,00");
    expect(formatBRL(0).replace(/\s/g, " ")).toBe("R$ 0,00");
  });

  it("sums", () => {
    expect(sumCents([100, 250, -50])).toBe(300);
    expect(sumCents([])).toBe(0);
  });
});
