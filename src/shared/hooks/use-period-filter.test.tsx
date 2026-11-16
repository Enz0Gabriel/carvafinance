import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(search),
}));

const { usePeriodFilter } = await import("./use-period-filter");

describe("usePeriodFilter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 15, 12));
    replace.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("defaults to the current month", () => {
    search = "";
    const { result } = renderHook(() => usePeriodFilter());
    expect(result.current.range).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(result.current.preset).toBe("this-month");
  });

  it("reads a custom range from the URL", () => {
    search = "from=2026-01-01&to=2026-01-31&preset=custom";
    const { result } = renderHook(() => usePeriodFilter());
    expect(result.current).toMatchObject({
      range: { from: "2026-01-01", to: "2026-01-31" },
      preset: "custom",
    });
  });

  it("falls back to the default for an invalid range", () => {
    search = "from=banana&to=2026-01-31";
    const { result } = renderHook(() => usePeriodFilter());
    expect(result.current.range).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });

  it("shifts by a month keeping other params and resetting page", () => {
    search = "accountId=x&page=3";
    const { result } = renderHook(() => usePeriodFilter());
    act(() => result.current.shift(-1));
    const url = new URL(replace.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/dashboard");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      accountId: "x",
      from: "2026-10-01",
      to: "2026-10-31",
      preset: "custom",
    });
  });
});
