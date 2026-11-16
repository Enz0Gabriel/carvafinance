import { beforeEach, describe, expect, it, vi } from "vitest";
import { toDbDate } from "@/domain/period";
import { db } from "@/server/db";
import { AppError } from "@/server/http";
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
} from "@/server/services/accounts.service";
import { createUser, resetDb } from "./helpers";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/server/auth", () => ({
  getSessionUserId: async () => session.userId,
}));

const routes = await import("@/app/api/accounts/route");
const itemRoutes = await import("@/app/api/accounts/[id]/route");

const base = { type: "CHECKING" as const, color: "#1E88E5" };

async function addTx(
  userId: string,
  data: {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amountCents: number;
    accountId: string;
    toAccountId?: string;
  },
) {
  const categoryId =
    data.type === "TRANSFER"
      ? null
      : (
          await db.category.create({
            data: {
              userId,
              name: "Cat",
              kind: data.type,
              color: "#000000",
              icon: "tag",
            },
          })
        ).id;
  return db.transaction.create({
    data: { userId, date: toDbDate("2026-11-10"), categoryId, ...data },
  });
}

describe("accounts service", () => {
  beforeEach(resetDb);

  it("computes balances from income, expenses and transfers", async () => {
    const { id: userId } = await createUser();
    const a = await createAccount(userId, {
      ...base,
      name: "A",
      initialBalanceCents: 10000,
    });
    const b = await createAccount(userId, {
      ...base,
      name: "B",
      initialBalanceCents: 0,
    });
    await addTx(userId, { type: "INCOME", amountCents: 5000, accountId: a.id });
    await addTx(userId, {
      type: "EXPENSE",
      amountCents: 2000,
      accountId: a.id,
    });
    await addTx(userId, {
      type: "TRANSFER",
      amountCents: 1000,
      accountId: a.id,
      toAccountId: b.id,
    });

    expect((await getAccount(userId, a.id)).balanceCents).toBe(12000);
    expect((await getAccount(userId, b.id)).balanceCents).toBe(1000);
  });

  it("hides accounts of other users", async () => {
    const owner = await createUser();
    const other = await createUser();
    const account = await createAccount(owner.id, {
      ...base,
      name: "A",
      initialBalanceCents: 0,
    });

    await expect(getAccount(other.id, account.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(getAccount(other.id, account.id)).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it("deletes unused accounts and archives used ones", async () => {
    const { id: userId } = await createUser();
    const unused = await createAccount(userId, {
      ...base,
      name: "Unused",
      initialBalanceCents: 0,
    });
    const used = await createAccount(userId, {
      ...base,
      name: "Used",
      initialBalanceCents: 0,
    });
    await addTx(userId, {
      type: "INCOME",
      amountCents: 100,
      accountId: used.id,
    });

    expect(await deleteAccount(userId, unused.id)).toEqual({
      result: "deleted",
    });
    expect(
      await db.account.findUnique({ where: { id: unused.id } }),
    ).toBeNull();

    expect(await deleteAccount(userId, used.id)).toEqual({
      result: "archived",
    });
    expect((await listAccounts(userId)).map((a) => a.id)).not.toContain(
      used.id,
    );
    const all = await listAccounts(userId, { includeArchived: true });
    expect(all.find((a) => a.id === used.id)).toMatchObject({
      archived: true,
      balanceCents: 100,
    });
  });
});

describe("accounts routes", () => {
  beforeEach(async () => {
    await resetDb();
    session.userId = null;
  });

  const json = (body: unknown) =>
    new Request("http://localhost/api/accounts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  const noParams = { params: Promise.resolve({}) };

  it("requires a session", async () => {
    const res = await routes.GET(
      new Request("http://localhost/api/accounts"),
      noParams,
    );
    expect(res.status).toBe(401);
  });

  it("creates (201), lists, updates and deletes", async () => {
    session.userId = (await createUser()).id;

    const created = await routes.POST(
      json({ ...base, name: "Nubank", initialBalanceCents: 150000 }),
      noParams,
    );
    expect(created.status).toBe(201);
    const account = await created.json();
    expect(account).toMatchObject({ name: "Nubank", balanceCents: 150000 });

    const list = await (
      await routes.GET(new Request("http://localhost/api/accounts"), noParams)
    ).json();
    expect(list).toHaveLength(1);

    const params = { params: Promise.resolve({ id: account.id }) };
    const patched = await itemRoutes.PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Inter" }),
      }),
      params,
    );
    expect((await patched.json()).name).toBe("Inter");

    const deleted = await itemRoutes.DELETE(
      new Request("http://localhost"),
      params,
    );
    expect(await deleted.json()).toEqual({ result: "deleted" });
  });

  it("rejects an empty name with 400 VALIDATION_ERROR", async () => {
    session.userId = (await createUser()).id;
    const res = await routes.POST(
      json({ ...base, name: "", initialBalanceCents: 0 }),
      noParams,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when patching another user's account", async () => {
    const owner = await createUser();
    const account = await createAccount(owner.id, {
      ...base,
      name: "A",
      initialBalanceCents: 0,
    });
    session.userId = (await createUser()).id;
    const res = await itemRoutes.PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "X" }),
      }),
      { params: Promise.resolve({ id: account.id }) },
    );
    expect(res.status).toBe(404);
  });
});
