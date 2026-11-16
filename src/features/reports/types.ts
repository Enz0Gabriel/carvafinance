import type { MonthTotals } from "@/domain/reports";

export type MonthlyReportRow = MonthTotals & { resultCents: number };

export type CategoryReportRow = {
  categoryId: string;
  name: string;
  color: string;
  parentId: string | null;
  totalCents: number;
  previousCents: number;
  changePct: number | null;
  share: number;
};

export type AccountReportRow = {
  accountId: string;
  name: string;
  color: string;
  inflowCents: number;
  outflowCents: number;
  balanceCents: number;
};

export const REPORT_TYPES = [
  "monthly",
  "categories",
  "accounts",
  "export",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
