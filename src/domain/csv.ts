const BOM = "\uFEFF";
const FORMULA_PREFIX = /^[=+\-@]/;
/** Plain numbers (e.g. "-45,90", "1.234,56") are safe and must stay numeric in Excel. */
const PLAIN_NUMBER = /^-?\d[\d.,]*$/;
const NEEDS_QUOTES = /[;"\r\n]/;

function formatCell(cell: string | number): string {
  if (typeof cell === "number") return String(cell);
  // Prevent spreadsheet formula injection (CSV injection).
  const safe =
    FORMULA_PREFIX.test(cell) && !PLAIN_NUMBER.test(cell) ? `'${cell}` : cell;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Excel-friendly (pt-BR) CSV: UTF-8 BOM, `;` separator, CRLF line breaks. */
export function toCsv(rows: (string | number)[][]): string {
  return BOM + rows.map((row) => row.map(formatCell).join(";")).join("\r\n");
}
