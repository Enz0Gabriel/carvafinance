import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("adds BOM, uses ; and CRLF, quotes and neutralizes formulas", () => {
    expect(
      toCsv([
        ["Descrição", "Valor"],
        ['=HYPERLINK("x")', -1599],
        ["a;b", 1],
      ]),
    ).toBe('\uFEFFDescrição;Valor\r\n"\'=HYPERLINK(""x"")";-1599\r\n"a;b";1');
  });

  it("neutralizes +, - and @ prefixes only in string cells", () => {
    expect(toCsv([["+1", "-2", "@x", -3]])).toBe("\uFEFF'+1;'-2;'@x;-3");
  });

  it("quotes cells with line breaks", () => {
    expect(toCsv([["linha 1\nlinha 2"]])).toBe('\uFEFF"linha 1\nlinha 2"');
  });
});
