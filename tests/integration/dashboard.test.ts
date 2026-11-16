import { beforeEach, describe, expect, it } from "vitest";
import { toDbDate } from "@/domain/period";
import { db } from "@/server/db";
import { getDashboard } from "@/server/services/dashboard.service";
import { createUser, resetDb } from "./helpers";

const NOV = { from: "2026-11-01", to: "2026-11-30" };

async function fixture(userId: string) {
  const account = (name: string, initialBalanceCents = 0) =>
    db.account.create({
      data: {
        userId,
        name,
        type: "CHECKING",
        color: "#1E88E5",
        initialBalanceCents,
      },
    });
  const category = (
    name: string,
    kind: "INCOME" | "EXPENSE",
    parentId?: string,
  ) =>
    db.category.create({
      data: { userId, name, kind, color: "#000000", icon: "tag", parentId },
    });

  const main = await account("Corrente", 100000);
  const savings = await account("Poupança");
  const salary = await category("Salário", "INCOME");
  const food = await category("Alimentação", "EXPENSE");
  const restaurants = await category("Restaurantes", "EXPENSE", food.id);
  const home = await category("Moradia", "EXPENSE");

  const tx = (
    type: "INCOME" | "EXPENSE",
    amountCents: number,
    date: string,
    categoryId: string,
  ) =>
    db.transaction.create({
      data: {
        userId,
        type,
        amountCents,
        date: toDbDate(date),
        accountId: main.id,
        categoryId,
      },
    });

  await tx("INCOME", 500000, "2026-11-05", salary.id);
  await tx("EXPENSE", 120000, "2026-11-10", food.id);
  await tx("EXPENSE", 30000, "2026-11-12", restaurants.id);
  await tx("EXPENSE", 50000, "2026-11-30", home.id);
  await db.transaction.create({
    data: {
      userId,
      type: "TRANSFER",
      amountCents: 10000,
      date: toDbDate("2026-11-15"),
      accountId: main.id,
      toAccountId: savings.id,
    },
  });
  await tx("INCOME", 400000, "2026-10-05", salary.id);
  await tx("EXPENSE", 100000, "2026-10-10", food.id);
}

describe("getDashboard", () => {
  beforeEach(resetDb);

  it("summarizes the period against the previous one, ignoring transfers", async () => {
    const { id: userId } = await createUser();
    await fixture(userId);
    const d = await getDashboard(userId, NOV);

    expect(d.income).toEqual({
      currentCents: 500000,
      previousCents: 400000,
      changePct: 25,
    });
    expect(d.expense).toEqual({
      currentCents: 200000,
      previousCents: 100000,
      changePct: 100,
    });
    expect(d.result).toEqual({
      currentCents: 300000,
      previousCents: 300000,
      changePct: 0,
    });
    // 1000,00 initial + 9000,00 income - 3000,00 expenses (transfer is internal)
    expect(d.totalBalanceCents).toBe(100000 + 900000 - 300000);
  });

  it("rolls subcategories into parents with shares", async () => {
    const { id: userId } = await createUser();
    await fixture(userId);
    const d = await getDashboard(userId, NOV);
    expect(
      d.expensesByCategory.map(({ name, totalCents, share }) => ({
        name,
        totalCents,
        share,
      })),
    ).toEqual([
      { name: "Alimentação", totalCents: 150000, share: 75 },
      { name: "Moradia", totalCents: 50000, share: 25 },
    ]);
  });

  it("builds 6-month cash flow and end-of-month balance trend", async () => {
    const { id: userId } = await createUser();
    await fixture(userId);
    const d = await getDashboard(userId, NOV);

    expect(d.cashFlow.map((m) => m.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(d.cashFlow[0]).toEqual({
      month: "2026-06",
      incomeCents: 0,
      expenseCents: 0,
    });
    expect(d.cashFlow[4]).toEqual({
      month: "2026-10",
      incomeCents: 400000,
      expenseCents: 100000,
    });
    expect(d.balanceTrend.map((p) => p.balanceCents)).toEqual([
      100000, 100000, 100000, 100000, 400000, 700000,
    ]);
    expect(d.accounts.map((a) => [a.name, a.balanceCents])).toEqual([
      ["Corrente", 690000],
      ["Poupança", 10000],
    ]);
    expect(d.recent).toHaveLength(5);
    expect(d.recent[0].date).toBe("2026-11-30");
  });

  it("returns zeros and null changes for a new user", async () => {
    const { id: userId } = await createUser();
    const d = await getDashboard(userId, NOV);
    expect(d.totalBalanceCents).toBe(0);
    expect(d.income).toEqual({
      currentCents: 0,
      previousCents: 0,
      changePct: null,
    });
    expect(d.expensesByCategory).toEqual([]);
    expect(d.cashFlow).toHaveLength(6);
    expect(d.recent).toEqual([]);
  });
});
