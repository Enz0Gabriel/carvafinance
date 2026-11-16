"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { usePeriodFilter } from "@/shared/hooks/use-period-filter";
import {
  TRANSACTION_SORTS,
  TRANSACTION_TYPES,
  type TransactionSort,
  type TransactionType,
} from "../schemas";

export type TransactionFilterKey =
  "type" | "accountId" | "categoryId" | "q" | "sort" | "page";

const oneOf = <T extends string>(
  values: readonly T[],
  value: string | null,
): T | undefined => (values.includes(value as T) ? (value as T) : undefined);

/** Transaction list filters from the URL, combined with the shared period filter. */
export function useTransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = usePeriodFilter();

  const filters = useMemo(
    () => ({
      from: period.range.from,
      to: period.range.to,
      type: oneOf<TransactionType>(TRANSACTION_TYPES, searchParams.get("type")),
      accountId: searchParams.get("accountId") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      sort:
        oneOf<TransactionSort>(TRANSACTION_SORTS, searchParams.get("sort")) ??
        "date_desc",
      page: Math.max(1, Number(searchParams.get("page")) || 1),
      pageSize: 20,
    }),
    [period.range, searchParams],
  );

  /** Updates one filter; any change other than `page` goes back to page 1. */
  const setFilter = useCallback(
    (key: TransactionFilterKey, value: string | number | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
      if (key !== "page") params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { filters, setFilter };
}
