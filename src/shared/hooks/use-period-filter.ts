"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  isValidRange,
  resolvePreset,
  shiftRange,
  type DateRange,
  type PeriodPreset,
} from "@/domain/period";

const PRESETS: readonly PeriodPreset[] = [
  "this-month",
  "last-month",
  "last-3-months",
  "last-6-months",
  "this-year",
  "custom",
];

const isPreset = (value: string | null): value is PeriodPreset =>
  PRESETS.includes(value as PeriodPreset);

export type PeriodFilter = {
  range: DateRange;
  preset: PeriodPreset;
  setPreset: (preset: PeriodPreset) => void;
  setRange: (range: DateRange) => void;
  shift: (months: number) => void;
};

/** Period filter stored in the URL (`from`, `to`, `preset`), defaulting to the current month. */
export function usePeriodFilter(): PeriodFilter {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { range, preset } = useMemo(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const urlPreset = searchParams.get("preset");
    if (from && to && isValidRange({ from, to })) {
      return {
        range: { from, to },
        preset: isPreset(urlPreset) ? urlPreset : "custom",
      };
    }
    return {
      range: resolvePreset("this-month", new Date()),
      preset: "this-month" as const,
    };
  }, [searchParams]);

  const write = useCallback(
    (next: DateRange, nextPreset: PeriodPreset) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", next.from);
      params.set("to", next.to);
      params.set("preset", nextPreset);
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPreset = useCallback(
    (next: PeriodPreset) => {
      if (next === "custom") write(range, "custom");
      else write(resolvePreset(next, new Date()), next);
    },
    [range, write],
  );

  const setRange = useCallback(
    (next: DateRange) => write(next, "custom"),
    [write],
  );
  const shift = useCallback(
    (months: number) => write(shiftRange(range, months), "custom"),
    [range, write],
  );

  return { range, preset, setPreset, setRange, shift };
}
