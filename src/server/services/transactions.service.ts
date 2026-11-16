import "server-only";
import { fromDbDate, toDbDate } from "@/domain/period";
import {
  transactionInputSchema,
  transactionPatchSchema,
  type Paginated,
  type TransactionDTO,
  type TransactionFilters,
  type TransactionInput,
} from "@/features/transactions/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { badRequest, notFound } from "@/server/http";
import { assertCategoryUsable } from "./categories.service";

const include = {
  account: { select: { id: true, name: true, color: true } },
  toAccount: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, name: true, color: true, icon: true } },
} satisfies Prisma.TransactionInclude;

type TransactionRow = Prisma.TransactionGetPayload<{ include: typeof include }>;

function toDTO(row: TransactionRow): TransactionDTO {
  return {
    id: row.id,
    type: row.type,
    amountCents: row.amountCents,
    date: fromDbDate(row.date),
    description: row.description,
    account: row.account,
    toAccount: row.toAccount,
    category: row.category,
  };
}

async function findOwned(userId: string, id: string): Promise<TransactionRow> {
  const row = await db.transaction.findFirst({
    where: { id, userId },
    include,
  });
  if (!row) throw notFound("Lançamento");
  return row;
}

async function assertAccountUsable(
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await db.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw notFound("Conta");
  if (account.archived)
    throw badRequest("ACCOUNT_ARCHIVED", "Esta conta está arquivada.");
}

/** Ownership and state checks shared by create and update. */
async function assertReferences(
  userId: string,
  input: TransactionInput,
): Promise<void> {
  await assertAccountUsable(userId, input.accountId);
  if (input.type === "TRANSFER") {
    await assertAccountUsable(userId, input.toAccountId);
  } else {
    await assertCategoryUsable(userId, input.categoryId, input.type);
  }
}

function toData(input: TransactionInput) {
  return {
    type: input.type,
    amountCents: input.amountCents,
    date: toDbDate(input.date),
    description: input.description,
    accountId: input.accountId,
    toAccountId: input.type === "TRANSFER" ? input.toAccountId : null,
    categoryId: input.type === "TRANSFER" ? null : input.categoryId,
  };
}

const ORDER: Record<
  TransactionFilters["sort"],
  Prisma.TransactionOrderByWithRelationInput[]
> = {
  date_desc: [{ date: "desc" }, { createdAt: "desc" }],
  date_asc: [{ date: "asc" }, { createdAt: "asc" }],
  amount_desc: [{ amountCents: "desc" }, { createdAt: "desc" }],
  amount_asc: [{ amountCents: "asc" }, { createdAt: "desc" }],
};

/** Prisma filter for a validated set of filters (shared with reports/export). */
export function buildTransactionWhere(
  userId: string,
  f: Omit<TransactionFilters, "page" | "pageSize" | "sort">,
): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [];
  if (f.accountId)
    and.push({
      OR: [{ accountId: f.accountId }, { toAccountId: f.accountId }],
    });
  if (f.categoryId) {
    and.push({
      OR: [
        { categoryId: f.categoryId },
        { category: { parentId: f.categoryId } },
      ],
    });
  }
  return {
    userId,
    ...(f.type ? { type: f.type } : {}),
    ...(f.from || f.to
      ? {
          date: {
            ...(f.from ? { gte: toDbDate(f.from) } : {}),
            ...(f.to ? { lte: toDbDate(f.to) } : {}),
          },
        }
      : {}),
    ...(f.q
      ? { description: { contains: f.q, mode: "insensitive" as const } }
      : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<Paginated<TransactionDTO>> {
  const where = buildTransactionWhere(userId, filters);
  const [rows, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include,
      orderBy: ORDER[filters.sort],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.transaction.count({ where }),
  ]);
  return {
    items: rows.map(toDTO),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getTransaction(
  userId: string,
  id: string,
): Promise<TransactionDTO> {
  return toDTO(await findOwned(userId, id));
}

export async function createTransaction(
  userId: string,
  input: unknown,
): Promise<TransactionDTO> {
  const data = transactionInputSchema.parse(input);
  await assertReferences(userId, data);
  return toDTO(
    await db.transaction.create({ data: { ...toData(data), userId }, include }),
  );
}

export async function updateTransaction(
  userId: string,
  id: string,
  patch: unknown,
): Promise<TransactionDTO> {
  const changes = transactionPatchSchema.parse(patch);
  const current = await findOwned(userId, id);
  const merged = transactionInputSchema.parse({
    type: current.type,
    amountCents: current.amountCents,
    date: fromDbDate(current.date),
    description: current.description,
    accountId: current.accountId,
    ...(current.toAccountId ? { toAccountId: current.toAccountId } : {}),
    ...(current.categoryId ? { categoryId: current.categoryId } : {}),
    ...Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ),
  });
  await assertReferences(userId, merged);
  return toDTO(
    await db.transaction.update({
      where: { id },
      data: toData(merged),
      include,
    }),
  );
}

export async function deleteTransaction(
  userId: string,
  id: string,
): Promise<void> {
  await findOwned(userId, id);
  await db.transaction.delete({ where: { id } });
}
