import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "@/server/services/transactions.service";
import { transactionFiltersSchema } from "@/features/transactions/schemas";
import { createUser, resetDb } from "./helpers";

async function fixture(userId: string) {
  const mk = (name: string) =>
    db.account.create({
      data: { userId, name, type: "CHECKING", color: "#1E88E5" },
    });
  const cat = (name: string, kind: "INCOME" | "EXPENSE", parentId?: string) =>
    db.category.create({
      data: { userId, name, kind, color: "#000000", icon: "tag", parentId },
    });
  const [a, b] = [await mk("A"), await mk("B")];
  const food = await cat("Alimentação", "EXPENSE");
  const restaurants = await cat("Restaurantes", "EXPENSE", food.id);
  const salary = await cat("Salário", "INCOME");
  return { a, b, food, restaurants, salary };
}

const filters = (input: Record<string, unknown>) =>
  transactionFiltersSchema.parse(input);
const expense = (
  accountId: string,
  categoryId: string,
  extra: Record<string, unknown> = {},
) => ({
  type: "EXPENSE",
  amountCents: 1000,
  date: "2026-11-10",
  accountId,
  categoryId,
  ...extra,
});

describe("transactions service", () => {
  let userId: string;
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeEach(async () => {
    await resetDb();
    userId = (await createUser()).id;
    f = await fixture(userId);
  });

  it("rejects an expense with an income category", async () => {
    await expect(
      createTransaction(userId, expense(f.a.id, f.salary.id)),
    ).rejects.toMatchObject({
      status: 400,
      code: "CATEGORY_KIND_MISMATCH",
    });
  });

  it("returns 404 for another user's account, destination or category", async () => {
    const other = await createUser();
    const o = await fixture(other.id);
    await expect(
      createTransaction(userId, expense(o.a.id, f.food.id)),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      createTransaction(userId, expense(f.a.id, o.food.id)),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      createTransaction(userId, {
        type: "TRANSFER",
        amountCents: 1,
        date: "2026-11-10",
        accountId: f.a.id,
        toAccountId: o.a.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects archived accounts", async () => {
    await db.account.update({
      where: { id: f.a.id },
      data: { archived: true },
    });
    await expect(
      createTransaction(userId, expense(f.a.id, f.food.id)),
    ).rejects.toMatchObject({ code: "ACCOUNT_ARCHIVED" });
  });

  it("validates the merged record when PATCH changes the type", async () => {
    const tx = await createTransaction(userId, expense(f.a.id, f.food.id));
    await expect(
      updateTransaction(userId, tx.id, { type: "TRANSFER" }),
    ).rejects.toMatchObject({ name: "ZodError" });

    const moved = await updateTransaction(userId, tx.id, {
      type: "TRANSFER",
      toAccountId: f.b.id,
    });
    expect(moved).toMatchObject({
      type: "TRANSFER",
      category: null,
      toAccount: { id: f.b.id },
    });

    const back = await updateTransaction(userId, tx.id, {
      type: "INCOME",
      categoryId: f.salary.id,
    });
    expect(back).toMatchObject({
      type: "INCOME",
      toAccount: null,
      category: { id: f.salary.id },
    });
  });

  it("keeps the last day of the month in that month", async () => {
    await createTransaction(
      userId,
      expense(f.a.id, f.food.id, { date: "2026-11-30" }),
    );
    const nov = await listTransactions(
      userId,
      filters({ from: "2026-11-01", to: "2026-11-30" }),
    );
    expect(nov.items.map((t) => t.date)).toEqual(["2026-11-30"]);
    const dec = await listTransactions(
      userId,
      filters({ from: "2026-12-01", to: "2026-12-31" }),
    );
    expect(dec.total).toBe(0);
  });

  it("paginates, searches and filters by account and parent category", async () => {
    for (let i = 0; i < 25; i++) {
      await createTransaction(
        userId,
        expense(f.a.id, f.food.id, { description: `Compra ${i}` }),
      );
    }
    await createTransaction(
      userId,
      expense(f.a.id, f.restaurants.id, { description: "Supermercado" }),
    );
    await createTransaction(userId, {
      type: "TRANSFER",
      amountCents: 500,
      date: "2026-11-11",
      accountId: f.a.id,
      toAccountId: f.b.id,
    });

    const page3 = await listTransactions(
      userId,
      filters({ pageSize: "10", page: "3" }),
    );
    expect(page3).toMatchObject({ total: 27, page: 3, pageSize: 10 });
    expect(page3.items).toHaveLength(7);

    expect(
      (await listTransactions(userId, filters({ q: "MERCADO" }))).items.map(
        (t) => t.description,
      ),
    ).toEqual(["Supermercado"]);
    expect(
      (
        await listTransactions(userId, filters({ accountId: f.b.id }))
      ).items.map((t) => t.type),
    ).toEqual(["TRANSFER"]);
    expect(
      (await listTransactions(userId, filters({ categoryId: f.food.id })))
        .total,
    ).toBe(26);
  });

  it("hides other users' transactions", async () => {
    const tx = await createTransaction(userId, expense(f.a.id, f.food.id));
    const other = await createUser();
    await expect(getTransaction(other.id, tx.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      updateTransaction(other.id, tx.id, { amountCents: 1 }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(deleteTransaction(other.id, tx.id)).rejects.toMatchObject({
      status: 404,
    });
    await deleteTransaction(userId, tx.id);
    await expect(getTransaction(userId, tx.id)).rejects.toMatchObject({
      status: 404,
    });
  });
});
