import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/server/services/transactions.service";
import { ok, withAuth } from "@/server/http";

type Params = { id: string };

export const GET = withAuth<Params>(async (_req, { userId, params }) =>
  ok(await getTransaction(userId, params.id)),
);

export const PATCH = withAuth<Params>(async (req, { userId, params }) =>
  ok(await updateTransaction(userId, params.id, await req.json())),
);

export const DELETE = withAuth<Params>(async (_req, { userId, params }) => {
  await deleteTransaction(userId, params.id);
  return new Response(null, { status: 204 });
});
