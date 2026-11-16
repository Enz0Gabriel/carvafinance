import type { MonthTotals } from "@/domain/reports";
import type { TransactionDTO } from "@/features/transactions/schemas";

export type Metric = {
  currentCents: number;
  previousCents: number;
  changePct: number | null;
};

export type CategoryTotal = {
  categoryId: string;
  name: string;
  color: string;
  totalCents: number;
  share: number;
};

export type DashboardDTO = {
  totalBalanceCents: number;
  income: Metric;
  expense: Metric;
  result: Metric;
  cashFlow: MonthTotals[];
  expensesByCategory: CategoryTotal[];
  balanceTrend: { month: string; balanceCents: number }[];
  accounts: { id: string; name: string; color: string; balanceCents: number }[];
  recent: TransactionDTO[];
};
