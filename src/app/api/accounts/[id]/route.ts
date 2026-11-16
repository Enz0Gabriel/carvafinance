import {
  deleteAccount,
  getAccount,
  updateAccount,
} from "@/server/services/accounts.service";
import { ok, withAuth } from "@/server/http";

type Params = { id: string };

export const GET = withAuth<Params>(async (_req, { userId, params }) =>
  ok(await getAccount(userId, params.id)),
);

export const PATCH = withAuth<Params>(async (req, { userId, params }) =>
  ok(await updateAccount(userId, params.id, await req.json())),
);

export const DELETE = withAuth<Params>(async (_req, { userId, params }) =>
  ok(await deleteAccount(userId, params.id)),
);
