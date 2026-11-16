import { z } from "zod";
import { isValidDate, isValidRange } from "@/domain/period";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência",
};

const id = z.string().min(1, "Campo obrigatório");
const day = z.string().refine(isValidDate, "Data inválida");

const common = {
  amountCents: z
    .number()
    .int("Valor inválido")
    .positive("Informe um valor maior que zero"),
  date: day,
  description: z.string().trim().max(120, "Use até 120 caracteres").default(""),
};

const incomeExpense = <T extends "INCOME" | "EXPENSE">(type: T) =>
  z.object({ type: z.literal(type), ...common, accountId: id, categoryId: id });

const transfer = z
  .object({
    type: z.literal("TRANSFER"),
    ...common,
    accountId: id,
    toAccountId: id,
  })
  .refine((data) => data.accountId !== data.toAccountId, {
    message: "Escolha contas diferentes",
    path: ["toAccountId"],
  });

export const transactionInputSchema = z.discriminatedUnion("type", [
  incomeExpense("INCOME"),
  incomeExpense("EXPENSE"),
  transfer,
]);

/** Any subset of fields; the merged record is validated with `transactionInputSchema`. */
export const transactionPatchSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amountCents: z.unknown(),
    date: z.unknown(),
    description: z.unknown(),
    accountId: z.unknown(),
    toAccountId: z.unknown(),
    categoryId: z.unknown(),
  })
  .partial();

export const TRANSACTION_SORTS = [
  "date_desc",
  "date_asc",
  "amount_desc",
  "amount_asc",
] as const;
export type TransactionSort = (typeof TRANSACTION_SORTS)[number];

export const transactionFiltersSchema = z
  .object({
    from: day.optional(),
    to: day.optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    accountId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    q: z.string().trim().max(60).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(TRANSACTION_SORTS).default("date_desc"),
  })
  .refine((f) => !f.from || !f.to || isValidRange({ from: f.from, to: f.to }), {
    message: "Período inválido",
    path: ["to"],
  });

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

type Ref = { id: string; name: string; color: string };

export type TransactionDTO = {
  id: string;
  type: TransactionType;
  amountCents: number;
  date: string;
  description: string;
  account: Ref;
  toAccount: Ref | null;
  category: (Ref & { icon: string }) | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
