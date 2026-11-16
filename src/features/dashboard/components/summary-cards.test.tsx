import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DashboardDTO } from "../types";
import { SummaryCards } from "./summary-cards";

const data = (overrides: Partial<DashboardDTO>): DashboardDTO => ({
  totalBalanceCents: 0,
  income: { currentCents: 0, previousCents: 0, changePct: null },
  expense: { currentCents: 0, previousCents: 0, changePct: null },
  result: { currentCents: 0, previousCents: 0, changePct: null },
  cashFlow: [],
  expensesByCategory: [],
  balanceTrend: [],
  accounts: [],
  recent: [],
  ...overrides,
});

describe("SummaryCards", () => {
  it("shows a dash when there is no previous period", () => {
    render(<SummaryCards data={data({})} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it("formats changes and colors an expense increase as bad", () => {
    render(
      <SummaryCards
        data={data({
          income: {
            currentCents: 500000,
            previousCents: 400000,
            changePct: 25,
          },
          expense: {
            currentCents: 200000,
            previousCents: 100000,
            changePct: 100,
          },
        })}
      />,
    );
    expect(screen.getByText("+25,0%")).toHaveClass("text-income");
    expect(screen.getByText("+100,0%")).toHaveClass("text-expense");
  });
});
