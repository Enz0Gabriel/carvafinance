import "server-only";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryDTO,
  type CategoryKind,
} from "@/features/categories/schemas";
import type { Category } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { badRequest, conflict, notFound } from "@/server/http";

const toDTO = (
  category: Category,
  children: CategoryDTO[] = [],
): CategoryDTO => ({
  id: category.id,
  name: category.name,
  kind: category.kind,
  color: category.color,
  icon: category.icon,
  archived: category.archived,
  parentId: category.parentId,
  children,
});

async function findOwned(userId: string, id: string): Promise<Category> {
  const category = await db.category.findFirst({ where: { id, userId } });
  if (!category) throw notFound("Categoria");
  return category;
}

const kindMismatch = () =>
  badRequest(
    "CATEGORY_KIND_MISMATCH",
    "O tipo da categoria não corresponde ao lançamento.",
  );
const tooDeep = () =>
  badRequest("CATEGORY_DEPTH", "Subcategorias só podem ter um nível.");

/** Validates a parent for a category of `kind` (owned, same kind, top-level). */
async function assertValidParent(
  userId: string,
  parentId: string,
  kind: CategoryKind,
  selfId?: string,
) {
  if (parentId === selfId) throw tooDeep();
  const parent = await findOwned(userId, parentId);
  if (parent.kind !== kind) throw kindMismatch();
  if (parent.parentId) throw tooDeep();
}

/** Ensures a category can be used on a transaction of `kind` (owned, active, same kind). */
export async function assertCategoryUsable(
  userId: string,
  categoryId: string,
  kind: CategoryKind,
): Promise<void> {
  const category = await findOwned(userId, categoryId);
  if (category.archived) {
    throw badRequest("CATEGORY_ARCHIVED", "Esta categoria está arquivada.");
  }
  if (category.kind !== kind) throw kindMismatch();
}

export async function listCategories(
  userId: string,
  opts: { kind?: CategoryKind; includeArchived?: boolean } = {},
): Promise<CategoryDTO[]> {
  const categories = await db.category.findMany({
    where: {
      userId,
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.includeArchived ? {} : { archived: false }),
    },
    orderBy: { name: "asc" },
  });
  const childrenOf = (id: string) =>
    categories.filter((c) => c.parentId === id).map((c) => toDTO(c));
  const ids = new Set(categories.map((c) => c.id));
  // Top level = no parent, or parent filtered out (e.g. archived) so children stay visible.
  return categories
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .map((c) => toDTO(c, childrenOf(c.id)));
}

export async function createCategory(
  userId: string,
  input: unknown,
): Promise<CategoryDTO> {
  const data = categoryCreateSchema.parse(input);
  if (data.parentId) await assertValidParent(userId, data.parentId, data.kind);
  return toDTO(await db.category.create({ data: { ...data, userId } }));
}

export async function updateCategory(
  userId: string,
  id: string,
  input: unknown,
): Promise<CategoryDTO> {
  const data = categoryUpdateSchema.parse(input);
  const current = await findOwned(userId, id);
  const kind = data.kind ?? current.kind;

  if (data.kind && data.kind !== current.kind) {
    const used = await db.transaction.count({
      where: { userId, categoryId: id },
    });
    if (used > 0) {
      throw conflict(
        "CATEGORY_IN_USE",
        "Não é possível mudar o tipo de uma categoria com lançamentos.",
      );
    }
  }

  const parentId =
    data.parentId === undefined ? current.parentId : data.parentId;
  if (parentId) {
    await assertValidParent(userId, parentId, kind, id);
    if (await db.category.count({ where: { userId, parentId: id } }))
      throw tooDeep();
  } else if (kind !== current.kind) {
    // Children must keep the same kind as their parent.
    const mismatched = await db.category.count({
      where: { userId, parentId: id, kind: { not: kind } },
    });
    if (mismatched) throw kindMismatch();
  }

  return toDTO(await db.category.update({ where: { id }, data }));
}

/** Deletes an unused category; categories with history are archived to preserve it. */
export async function deleteCategory(
  userId: string,
  id: string,
): Promise<{ result: "deleted" | "archived" }> {
  await findOwned(userId, id);
  const used = await db.transaction.count({
    where: { userId, categoryId: id },
  });
  if (used > 0) {
    await db.category.update({ where: { id }, data: { archived: true } });
    return { result: "archived" };
  }
  await db.category.delete({ where: { id } });
  return { result: "deleted" };
}
