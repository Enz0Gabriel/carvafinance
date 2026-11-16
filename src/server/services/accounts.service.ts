import "server-only";
import { computeBalance } from "@/domain/balance";
import {
  accountCreateSchema,
  accountUpdateSchema,
  type AccountDTO,
} from "@/features/accounts/schemas";
import type { Account } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { notFound } from "@/server/http";

/** Current balance (cents) of every account of the user, archived included. */
export async function getAccountBalances(
  userId: string,
): Promise<Map<string, number>> {
  const [accounts, outgoing, incoming] = await Promise.all([
    db.account.findMany({
      where: { userId },
      select: { id: true, initialBalanceCents: true },
    }),
    db.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ["toAccountId"],
      where: { userId, type: "TRANSFER" },
      _sum: { amountCents: true },
    }),
  ]);

  const sumOf = (accountId: string, type: "INCOME" | "EXPENSE" | "TRANSFER") =>
    outgoing.find((row) => row.accountId === accountId && row.type === type)
      ?._sum.amountCents ?? 0;

  return new Map(
    accounts.map((account) => [
      account.id,
      computeBalance({
        initialCents: account.initialBalanceCents,
        incomeCents: sumOf(account.id, "INCOME"),
        expenseCents: sumOf(account.id, "EXPENSE"),
        transferOutCents: sumOf(account.id, "TRANSFER"),
        transferInCents:
          incoming.find((row) => row.toAccountId === account.id)?._sum
            .amountCents ?? 0,
      }),
    ]),
  );
}

function toDTO(account: Account, balanceCents: number): AccountDTO {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalanceCents: account.initialBalanceCents,
    color: account.color,
    archived: account.archived,
    balanceCents,
  };
}

async function findOwned(userId: string, id: string): Promise<Account> {
  const account = await db.account.findFirst({ where: { id, userId } });
  if (!account) throw notFound("Conta");
  return account;
}

async function withBalance(
  userId: string,
  account: Account,
): Promise<AccountDTO> {
  const balances = await getAccountBalances(userId);
  return toDTO(
    account,
    balances.get(account.id) ?? account.initialBalanceCents,
  );
}

export async function listAccounts(
  userId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<AccountDTO[]> {
  const [accounts, balances] = await Promise.all([
    db.account.findMany({
      where: { userId, ...(opts.includeArchived ? {} : { archived: false }) },
      orderBy: { name: "asc" },
    }),
    getAccountBalances(userId),
  ]);
  return accounts.map((account) =>
    toDTO(account, balances.get(account.id) ?? 0),
  );
}

export async function getAccount(
  userId: string,
  id: string,
): Promise<AccountDTO> {
  return withBalance(userId, await findOwned(userId, id));
}

export async function createAccount(
  userId: string,
  input: unknown,
): Promise<AccountDTO> {
  const data = accountCreateSchema.parse(input);
  const account = await db.account.create({ data: { ...data, userId } });
  return toDTO(account, account.initialBalanceCents);
}

export async function updateAccount(
  userId: string,
  id: string,
  input: unknown,
): Promise<AccountDTO> {
  const data = accountUpdateSchema.parse(input);
  await findOwned(userId, id);
  const account = await db.account.update({ where: { id }, data });
  return withBalance(userId, account);
}

/** Deletes an unused account; accounts with history are archived to preserve it. */
export async function deleteAccount(
  userId: string,
  id: string,
): Promise<{ result: "deleted" | "archived" }> {
  await findOwned(userId, id);
  const used = await db.transaction.count({
    where: { userId, OR: [{ accountId: id }, { toAccountId: id }] },
  });
  if (used > 0) {
    await db.account.update({ where: { id }, data: { archived: true } });
    return { result: "archived" };
  }
  await db.account.delete({ where: { id } });
  return { result: "deleted" };
}
