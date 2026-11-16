import {
  deleteCategory,
  updateCategory,
} from "@/server/services/categories.service";
import { ok, withAuth } from "@/server/http";

type Params = { id: string };

export const PATCH = withAuth<Params>(async (req, { userId, params }) =>
  ok(await updateCategory(userId, params.id, await req.json())),
);

export const DELETE = withAuth<Params>(async (_req, { userId, params }) =>
  ok(await deleteCategory(userId, params.id)),
);
