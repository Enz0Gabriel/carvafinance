import "server-only";
import { previousRange, toDbDate, type DateRange } from "@/domain/period";
import { withShares } from "@/domain/reports";
import type { CategoryTotal, DashboardDTO } from "@/features/dashboard/types";
import { transactionFiltersSchema } from "@/features/transactions/schemas";
import { db } from "@/server/db";
import { getAccountBalances } from "./accounts.service";
import {
  lastSixMonths,
  metric,
  monthlyTotals,
  netAfter,
  sumIncomeExpense,
} from "./aggregations";
import { listTransactions } from "./transactions.service";

/** Expense totals per top-level category (subcategories rolled into their parent). */
async function expensesByCategory(
  userId: string,
  range: DateRange,
): Promise<CategoryTotal[]> {
  const [rows, categories] = await Promise.all([
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: toDbDate(range.from), lte: toDbDate(range.to) },
      },
      _sum: { amountCents: true },
    }),
    db.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, parentId: true },
    }),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const row of rows) {
    const category = row.categoryId ? byId.get(row.categoryId) : undefined;
    if (!category) continue;
    const rootId = category.parentId ?? category.id;
    totals.set(rootId, (totals.get(rootId) ?? 0) + (row._sum.amountCents ?? 0));
  }
  return withShares(
    [...totals].map(([categoryId, totalCents]) => {
      const root = byId.get(categoryId)!;
      return { categoryId, name: root.name, color: root.color, totalCents };
    }),
  );
}

export async function getDashboard(
  userId: string,
  range: DateRange,
): Promise<DashboardDTO> {
  const window = lastSixMonths(range.to);
  const [
    current,
    previous,
    cashFlow,
    balances,
    accounts,
    byCategory,
    futureNet,
    recent,
  ] = await Promise.all([
    sumIncomeExpense(userId, range),
    sumIncomeExpense(userId, previousRange(range)),
    monthlyTotals(userId, window),
    getAccountBalances(userId),
    db.account.findMany({
      where: { userId, archived: false },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    expensesByCategory(userId, range),
    netAfter(userId, window.to),
    listTransactions(userId, transactionFiltersSchema.parse({ pageSize: 5 })),
  ]);

  const totalBalanceCents = [...balances.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  // Walk back from today's total: end-of-month balance = next month's end − that month's net.
  const balanceTrend: DashboardDTO["balanceTrend"] = [];
  let balance = totalBalanceCents - futureNet;
  for (let i = cashFlow.length - 1; i >= 0; i--) {
    balanceTrend.unshift({ month: cashFlow[i].month, balanceCents: balance });
    balance -= cashFlow[i].incomeCents - cashFlow[i].expenseCents;
  }

  return {
    totalBalanceCents,
    income: metric(current.incomeCents, previous.incomeCents),
    expense: metric(current.expenseCents, previous.expenseCents),
    result: metric(
      current.incomeCents - current.expenseCents,
      previous.incomeCents - previous.expenseCents,
    ),
    cashFlow,
    expensesByCategory: byCategory,
    balanceTrend,
    accounts: accounts.map((account) => ({
      ...account,
      balanceCents: balances.get(account.id) ?? 0,
    })),
    recent: recent.items,
  };
}
