"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/domain/period";
import type { CategoryKind } from "@/features/categories/schemas";
import { apiFetch, toQuery } from "@/shared/lib/api";
import type {
  AccountReportRow,
  CategoryReportRow,
  MonthlyReportRow,
} from "../types";

function useReport<T>(type: string, params: Record<string, string>) {
  return useQuery({
    queryKey: ["reports", type, params],
    queryFn: () => apiFetch<T>(`/api/reports/${type}${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export const useMonthlyReport = (range: DateRange) =>
  useReport<MonthlyReportRow[]>("monthly", range);
export const useCategoryReport = (range: DateRange, kind: CategoryKind) =>
  useReport<CategoryReportRow[]>("categories", { ...range, kind });
export const useAccountReport = (range: DateRange) =>
  useReport<AccountReportRow[]>("accounts", range);

export const exportUrl = (range: DateRange) =>
  `/api/reports/export${toQuery(range)}`;
