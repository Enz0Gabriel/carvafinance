export type MonthTotals = {
  month: string;
  incomeCents: number;
  expenseCents: number;
};

/** One row per month (in the given order), zero-filled where no data exists. */
export function fillMonths(
  rows: MonthTotals[],
  months: string[],
): MonthTotals[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map(
    (month) => byMonth.get(month) ?? { month, incomeCents: 0, expenseCents: 0 },
  );
}

/** Adds each row's percentage of the total (1 decimal), sorted by total descending. */
export function withShares<T extends { totalCents: number }>(
  rows: T[],
): (T & { share: number })[] {
  const total = rows.reduce((sum, row) => sum + row.totalCents, 0);
  return [...rows]
    .sort((a, b) => b.totalCents - a.totalCents)
    .map((row) => ({
      ...row,
      share: total === 0 ? 0 : Math.round((row.totalCents / total) * 1000) / 10,
    }));
}
