import {
  CATEGORY_KINDS,
  type CategoryKind,
} from "@/features/categories/schemas";
import {
  createCategory,
  listCategories,
} from "@/server/services/categories.service";
import { ok, withAuth } from "@/server/http";

const isKind = (value: string | null): value is CategoryKind =>
  CATEGORY_KINDS.includes(value as CategoryKind);

export const GET = withAuth(async (req, { userId }) => {
  const params = new URL(req.url).searchParams;
  const kind = params.get("kind");
  return ok(
    await listCategories(userId, {
      kind: isKind(kind) ? kind : undefined,
      includeArchived: params.get("includeArchived") === "true",
    }),
  );
});

export const POST = withAuth(async (req, { userId }) =>
  ok(await createCategory(userId, await req.json()), 201),
);
