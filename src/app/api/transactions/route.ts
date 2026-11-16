import { transactionFiltersSchema } from "@/features/transactions/schemas";
import {
  createTransaction,
  listTransactions,
} from "@/server/services/transactions.service";
import { ok, withAuth } from "@/server/http";

export const GET = withAuth(async (req, { userId }) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return ok(
    await listTransactions(userId, transactionFiltersSchema.parse(params)),
  );
});

export const POST = withAuth(async (req, { userId }) =>
  ok(await createTransaction(userId, await req.json()), 201),
);
