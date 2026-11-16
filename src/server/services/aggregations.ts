import "server-only";
import { addMonths, format, parseISO } from "date-fns";
import { percentChange } from "@/domain/balance";
import { listMonths, toDbDate, type DateRange } from "@/domain/period";
import { fillMonths, type MonthTotals } from "@/domain/reports";
import type { Metric } from "@/features/dashboard/types";
import { db } from "@/server/db";

/** Income and expense totals (cents) for a date range; transfers excluded. */
export async function sumIncomeExpense(
  userId: string,
  range: DateRange,
): Promise<{ incomeCents: number; expenseCents: number }> {
  const rows = await db.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: toDbDate(range.from), lte: toDbDate(range.to) },
    },
    _sum: { amountCents: true },
  });
  const sum = (type: "INCOME" | "EXPENSE") =>
    rows.find((row) => row.type === type)?._sum.amountCents ?? 0;
  return { incomeCents: sum("INCOME"), expenseCents: sum("EXPENSE") };
}

export const metric = (
  currentCents: number,
  previousCents: number,
): Metric => ({
  currentCents,
  previousCents,
  changePct: percentChange(currentCents, previousCents),
});

/** Income/expense per month (`YYYY-MM`) in the range, zero-filled. */
export async function monthlyTotals(
  userId: string,
  range: DateRange,
): Promise<MonthTotals[]> {
  const rows = await db.$queryRaw<
    { month: string; type: "INCOME" | "EXPENSE"; total: bigint }[]
  >`
    SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month, "type", SUM("amount_cents")::bigint AS total
    FROM "transactions"
    WHERE "user_id" = ${userId}
      AND "type" IN ('INCOME', 'EXPENSE')
      AND "date" BETWEEN ${toDbDate(range.from)} AND ${toDbDate(range.to)}
    GROUP BY 1, 2`;

  const byMonth = new Map<string, MonthTotals>();
  for (const row of rows) {
    const entry = byMonth.get(row.month) ?? {
      month: row.month,
      incomeCents: 0,
      expenseCents: 0,
    };
    if (row.type === "INCOME") entry.incomeCents = Number(row.total);
    else entry.expenseCents = Number(row.total);
    byMonth.set(row.month, entry);
  }
  return fillMonths([...byMonth.values()], listMonths(range));
}

/** The 6 whole months ending at the month of `date` (`YYYY-MM-DD`). */
export function lastSixMonths(date: string): DateRange {
  const end = parseISO(date);
  const start = addMonths(end, -5);
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0);
  return {
    from: format(start, "yyyy-MM-01"),
    to: format(lastDay, "yyyy-MM-dd"),
  };
}

/** Net effect (income − expense) of transactions dated after `date`. */
export async function netAfter(userId: string, date: string): Promise<number> {
  const rows = await db.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gt: toDbDate(date) },
    },
    _sum: { amountCents: true },
  });
  return rows.reduce(
    (net, row) =>
      net + (row.type === "INCOME" ? 1 : -1) * (row._sum.amountCents ?? 0),
    0,
  );
}
