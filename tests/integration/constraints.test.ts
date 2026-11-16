import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { toDbDate } from "@/domain/period";
import { createUser, resetDb } from "./helpers";

async function setup() {
  const user = await createUser();
  const [a, b] = await Promise.all(
    ["A", "B"].map((name) =>
      db.account.create({
        data: { userId: user.id, name, type: "CHECKING", color: "#1E88E5" },
      }),
    ),
  );
  const category = await db.category.create({
    data: {
      userId: user.id,
      name: "Alimentação",
      kind: "EXPENSE",
      color: "#dc2626",
      icon: "utensils",
    },
  });
  return { userId: user.id, a, b, category };
}

describe("database check constraints", () => {
  beforeEach(resetDb);

  it("rejects non-positive amounts", async () => {
    const { userId, a, category } = await setup();
    await expect(
      db.transaction.create({
        data: {
          userId,
          type: "EXPENSE",
          amountCents: 0,
          date: toDbDate("2026-11-10"),
          accountId: a.id,
          categoryId: category.id,
        },
      }),
    ).rejects.toThrow(/amount_positive/);
  });

  it("rejects a transfer to the same account", async () => {
    const { userId, a } = await setup();
    await expect(
      db.transaction.create({
        data: {
          userId,
          type: "TRANSFER",
          amountCents: 100,
          date: toDbDate("2026-11-10"),
          accountId: a.id,
          toAccountId: a.id,
        },
      }),
    ).rejects.toThrow(/transfer_shape/);
  });

  it("rejects an expense without category", async () => {
    const { userId, a } = await setup();
    await expect(
      db.transaction.create({
        data: {
          userId,
          type: "EXPENSE",
          amountCents: 100,
          date: toDbDate("2026-11-10"),
          accountId: a.id,
        },
      }),
    ).rejects.toThrow(/transfer_shape/);
  });

  it("accepts a valid transfer", async () => {
    const { userId, a, b } = await setup();
    const tx = await db.transaction.create({
      data: {
        userId,
        type: "TRANSFER",
        amountCents: 100,
        date: toDbDate("2026-11-10"),
        accountId: a.id,
        toAccountId: b.id,
      },
    });
    expect(tx.amountCents).toBe(100);
  });
});
