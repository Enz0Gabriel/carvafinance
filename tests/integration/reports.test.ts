import { beforeEach, describe, expect, it, vi } from "vitest";
import { toDbDate } from "@/domain/period";
import { db } from "@/server/db";
import {
  accountsReport,
  categoriesReport,
  CSV_HEADER,
  exportTransactionsCsv,
  monthlyReport,
} from "@/server/services/reports.service";
import { createUser, resetDb } from "./helpers";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/server/auth", () => ({
  getSessionUserId: async () => session.userId,
}));
const reportRoute = await import("@/app/api/reports/[type]/route");

async function fixture(userId: string) {
  const account = (name: string) =>
    db.account.create({
      data: { userId, name, type: "CHECKING", color: "#1E88E5" },
    });
  const category = (name: string, kind: "INCOME" | "EXPENSE") =>
    db.category.create({
      data: { userId, name, kind, color: "#000000", icon: "tag" },
    });
  const a = await account("Corrente");
  const b = await account("Poupança");
  const salary = await category("Salário", "INCOME");
  const food = await category("Alimentação", "EXPENSE");
  const home = await category("Moradia", "EXPENSE");
  const tx = (
    type: "INCOME" | "EXPENSE",
    amountCents: number,
    date: string,
    categoryId: string,
    description = "",
  ) =>
    db.transaction.create({
      data: {
        userId,
        type,
        amountCents,
        date: toDbDate(date),
        accountId: a.id,
        categoryId,
        description,
      },
    });
  await tx("INCOME", 500000, "2026-11-05", salary.id, "Salário");
  await tx("EXPENSE", 4590, "2026-11-10", food.id, "=1+1");
  await tx("EXPENSE", 30000, "2026-11-12", home.id, "Aluguel");
  await tx("EXPENSE", 1000, "2026-09-12", food.id);
  await db.transaction.create({
    data: {
      userId,
      type: "TRANSFER",
      amountCents: 20000,
      date: toDbDate("2026-11-15"),
      accountId: a.id,
      toAccountId: b.id,
    },
  });
  return { a, b };
}

describe("reports", () => {
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    userId = (await createUser()).id;
    session.userId = userId;
  });

  it("monthly report zero-fills months and computes results", async () => {
    await fixture(userId);
    const rows = await monthlyReport(userId, {
      from: "2026-09-01",
      to: "2026-11-30",
    });
    expect(rows).toEqual([
      {
        month: "2026-09",
        incomeCents: 0,
        expenseCents: 1000,
        resultCents: -1000,
      },
      { month: "2026-10", incomeCents: 0, expenseCents: 0, resultCents: 0 },
      {
        month: "2026-11",
        incomeCents: 500000,
        expenseCents: 34590,
        resultCents: 465410,
      },
    ]);
  });

  it("category report shares sum to 100 and change is null without history", async () => {
    await fixture(userId);
    const rows = await categoriesReport(
      userId,
      { from: "2026-11-01", to: "2026-11-30" },
      "EXPENSE",
    );
    const total = rows.reduce((sum, r) => sum + r.share, 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(0.1);
    expect(rows.every((r) => r.changePct === null)).toBe(true);
  });

  it("account report treats transfers as outflow/inflow", async () => {
    await fixture(userId);
    const rows = await accountsReport(userId, {
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(rows.find((r) => r.name === "Corrente")).toMatchObject({
      inflowCents: 500000,
      outflowCents: 54590,
    });
    expect(rows.find((r) => r.name === "Poupança")).toMatchObject({
      inflowCents: 20000,
      outflowCents: 0,
      balanceCents: 20000,
    });
  });

  it("exports Excel-friendly CSV with neutralized formulas", async () => {
    await fixture(userId);
    const csv = await exportTransactionsCsv(userId, {
      from: "2026-11-01",
      to: "2026-11-30",
    });
    const lines = csv.split("\r\n");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(lines[0]).toBe(`\uFEFF${CSV_HEADER.join(";")}`);
    expect(lines).toContain(
      "10/11/2026;Despesa;'=1+1;Alimentação;Corrente;;-45,90",
    );
    expect(lines).toContain(
      "05/11/2026;Receita;Salário;Salário;Corrente;;5.000,00",
    );
    expect(lines).toHaveLength(5);
  });

  it("route returns 404 for unknown report types and a CSV attachment for export", async () => {
    const unknown = await reportRoute.GET(
      new Request(
        "http://localhost/api/reports/x?from=2026-11-01&to=2026-11-30",
      ),
      {
        params: Promise.resolve({ type: "x" }),
      },
    );
    expect(unknown.status).toBe(404);

    const res = await reportRoute.GET(
      new Request(
        "http://localhost/api/reports/export?from=2026-11-01&to=2026-11-30",
      ),
      { params: Promise.resolve({ type: "export" }) },
    );
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="carvafinance-2026-11-01-a-2026-11-30.csv"',
    );
  });
});
