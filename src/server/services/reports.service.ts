import "server-only";
import { format, parseISO } from "date-fns";
import { percentChange } from "@/domain/balance";
import { toCsv } from "@/domain/csv";
import {
  fromDbDate,
  previousRange,
  toDbDate,
  type DateRange,
} from "@/domain/period";
import type { MonthTotals } from "@/domain/reports";
import type { CategoryKind } from "@/features/categories/schemas";
import type {
  AccountReportRow,
  CategoryReportRow,
} from "@/features/reports/types";
import {
  TRANSACTION_TYPE_LABELS,
  type TransactionFilters,
} from "@/features/transactions/schemas";
import { db } from "@/server/db";
import { getAccountBalances } from "./accounts.service";
import { monthlyTotals } from "./aggregations";
import { buildTransactionWhere } from "./transactions.service";

const inRange = (range: DateRange) => ({
  gte: toDbDate(range.from),
  lte: toDbDate(range.to),
});

export async function monthlyReport(
  userId: string,
  range: DateRange,
): Promise<(MonthTotals & { resultCents: number })[]> {
  const months = await monthlyTotals(userId, range);
  return months.map((m) => ({
    ...m,
    resultCents: m.incomeCents - m.expenseCents,
  }));
}

export async function categoriesReport(
  userId: string,
  range: DateRange,
  kind: CategoryKind,
): Promise<CategoryReportRow[]> {
  const totalsFor = (r: DateRange) =>
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: kind, date: inRange(r) },
      _sum: { amountCents: true },
    });
  const [current, previous, categories] = await Promise.all([
    totalsFor(range),
    totalsFor(previousRange(range)),
    db.category.findMany({
      where: { userId, kind },
      select: { id: true, name: true, color: true, parentId: true },
    }),
  ]);

  const sumOf = (rows: typeof current, id: string) =>
    rows.find((row) => row.categoryId === id)?._sum.amountCents ?? 0;
  const kindTotal = current.reduce(
    (sum, row) => sum + (row._sum.amountCents ?? 0),
    0,
  );

  return categories
    .map((category) => {
      const totalCents = sumOf(current, category.id);
      const previousCents = sumOf(previous, category.id);
      return {
        categoryId: category.id,
        name: category.name,
        color: category.color,
        parentId: category.parentId,
        totalCents,
        previousCents,
        changePct: percentChange(totalCents, previousCents),
        share:
          kindTotal === 0
            ? 0
            : Math.round((totalCents / kindTotal) * 1000) / 10,
      };
    })
    .filter((row) => row.totalCents > 0 || row.previousCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents);
}

export async function accountsReport(
  userId: string,
  range: DateRange,
): Promise<AccountReportRow[]> {
  const [outgoing, incoming, accounts, balances] = await Promise.all([
    db.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, date: inRange(range) },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ["toAccountId"],
      where: { userId, type: "TRANSFER", date: inRange(range) },
      _sum: { amountCents: true },
    }),
    db.account.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, archived: true },
      orderBy: { name: "asc" },
    }),
    getAccountBalances(userId),
  ]);

  const sum = (accountId: string, type: string) =>
    outgoing.find((row) => row.accountId === accountId && row.type === type)
      ?._sum.amountCents ?? 0;

  return accounts
    .map((account) => ({
      accountId: account.id,
      name: account.name,
      color: account.color,
      inflowCents:
        sum(account.id, "INCOME") +
        (incoming.find((row) => row.toAccountId === account.id)?._sum
          .amountCents ?? 0),
      outflowCents: sum(account.id, "EXPENSE") + sum(account.id, "TRANSFER"),
      balanceCents: balances.get(account.id) ?? 0,
      archived: account.archived,
    }))
    .filter(
      (row) => !row.archived || row.inflowCents > 0 || row.outflowCents > 0,
    )
    .map((row) => ({
      accountId: row.accountId,
      name: row.name,
      color: row.color,
      inflowCents: row.inflowCents,
      outflowCents: row.outflowCents,
      balanceCents: row.balanceCents,
    }));
}

const DECIMAL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const CSV_HEADER = [
  "Data",
  "Tipo",
  "Descrição",
  "Categoria",
  "Conta",
  "Conta destino",
  "Valor",
];

/** Every transaction matching the filters (no pagination), as Excel-friendly CSV. */
export async function exportTransactionsCsv(
  userId: string,
  filters: Omit<TransactionFilters, "page" | "pageSize" | "sort">,
): Promise<string> {
  const rows = await db.transaction.findMany({
    where: buildTransactionWhere(userId, filters),
    include: {
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return toCsv([
    CSV_HEADER,
    ...rows.map((row) => [
      format(parseISO(fromDbDate(row.date)), "dd/MM/yyyy"),
      TRANSACTION_TYPE_LABELS[row.type],
      row.description,
      row.category?.name ?? "",
      row.account.name,
      row.toAccount?.name ?? "",
      (row.type === "EXPENSE" ? "-" : "") +
        DECIMAL.format(row.amountCents / 100),
    ]),
  ]);
}
