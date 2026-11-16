"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/domain/period";
import { apiFetch, toQuery } from "@/shared/lib/api";
import type { DashboardDTO } from "../types";

export function useDashboard(range: DateRange) {
  return useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => apiFetch<DashboardDTO>(`/api/dashboard${toQuery(range)}`),
    placeholderData: keepPreviousData,
  });
}
