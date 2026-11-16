import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodPreset =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "custom";

/** Inclusive calendar range, both ends as `YYYY-MM-DD`. */
export type DateRange = { from: string; to: string };

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  "this-month": "Este mês",
  "last-month": "Mês passado",
  "last-3-months": "Últimos 3 meses",
  "last-6-months": "Últimos 6 meses",
  "this-year": "Este ano",
  custom: "Personalizado",
};

const DAY_FORMAT = "yyyy-MM-dd";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parses `YYYY-MM-DD` as a local calendar day; returns null when malformed or nonexistent. */
function parseDay(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const date = parse(value, DAY_FORMAT, new Date(0));
  return isValid(date) && format(date, DAY_FORMAT) === value ? date : null;
}

function mustParseDay(value: string): Date {
  const date = parseDay(value);
  if (!date) throw new RangeError(`Data inválida: ${value}`);
  return date;
}

const toDay = (date: Date) => format(date, DAY_FORMAT);

const monthsRange = (first: Date, last: Date): DateRange => ({
  from: toDay(startOfMonth(first)),
  to: toDay(endOfMonth(last)),
});

/** Number of whole calendar months covered, or null if the range is not month-aligned. */
function wholeMonthCount(range: DateRange): number | null {
  const from = mustParseDay(range.from);
  const to = mustParseDay(range.to);
  if (
    toDay(startOfMonth(from)) !== range.from ||
    toDay(endOfMonth(to)) !== range.to
  ) {
    return null;
  }
  return eachMonthOfInterval({ start: from, end: to }).length;
}

export function resolvePreset(
  preset: Exclude<PeriodPreset, "custom">,
  today: Date,
): DateRange {
  switch (preset) {
    case "this-month":
      return monthsRange(today, today);
    case "last-month": {
      const last = subMonths(today, 1);
      return monthsRange(last, last);
    }
    case "last-3-months":
      return monthsRange(subMonths(today, 2), today);
    case "last-6-months":
      return monthsRange(subMonths(today, 5), today);
    case "this-year":
      return { from: toDay(startOfYear(today)), to: toDay(endOfYear(today)) };
  }
}

export function previousRange(range: DateRange): DateRange {
  const months = wholeMonthCount(range);
  const from = mustParseDay(range.from);
  if (months !== null) {
    return monthsRange(subMonths(from, months), subMonths(from, 1));
  }
  const days = differenceInCalendarDays(mustParseDay(range.to), from) + 1;
  return { from: toDay(addDays(from, -days)), to: toDay(addDays(from, -1)) };
}

/** Moves a month-aligned range by whole months (non-aligned ranges shift both ends by months). */
export function shiftRange(range: DateRange, months: number): DateRange {
  const from = mustParseDay(range.from);
  const to = mustParseDay(range.to);
  if (wholeMonthCount(range) !== null) {
    return monthsRange(addMonths(from, months), addMonths(to, months));
  }
  return {
    from: toDay(addMonths(from, months)),
    to: toDay(addMonths(to, months)),
  };
}

export function listMonths(range: DateRange): string[] {
  return eachMonthOfInterval({
    start: mustParseDay(range.from),
    end: mustParseDay(range.to),
  }).map((month) => format(month, "yyyy-MM"));
}

/** True for an existing calendar day written as `YYYY-MM-DD`. */
export function isValidDate(value: string): boolean {
  return parseDay(value) !== null;
}

export function isValidRange(range: DateRange): boolean {
  const from = parseDay(range.from);
  const to = parseDay(range.to);
  return from !== null && to !== null && from <= to;
}

/** `YYYY-MM-DD` → Date at UTC midnight, for Prisma `@db.Date` columns. */
export function toDbDate(date: string): Date {
  mustParseDay(date);
  return new Date(`${date}T00:00:00.000Z`);
}

/** Prisma `@db.Date` value (UTC midnight) → `YYYY-MM-DD`. */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** Human label: "Novembro de 2026", "Set 2026 – nov 2026" or "10/11/2026 – 19/11/2026". */
export function formatRangeLabel(range: DateRange): string {
  const from = mustParseDay(range.from);
  const to = mustParseDay(range.to);
  const months = wholeMonthCount(range);
  if (months === 1)
    return capitalize(format(from, "MMMM 'de' yyyy", { locale: ptBR }));
  if (months !== null) {
    const short = (date: Date) => format(date, "MMM yyyy", { locale: ptBR });
    return capitalize(`${short(from)} – ${short(to)}`);
  }
  return `${format(from, "dd/MM/yyyy")} – ${format(to, "dd/MM/yyyy")}`;
}
