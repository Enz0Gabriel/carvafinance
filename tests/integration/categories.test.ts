import { beforeEach, describe, expect, it } from "vitest";
import { toDbDate } from "@/domain/period";
import { db } from "@/server/db";
import {
  assertCategoryUsable,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/server/services/categories.service";
import { createUser, resetDb } from "./helpers";

const expense = { kind: "EXPENSE" as const, color: "#ef6c00", icon: "tag" };
const income = { kind: "INCOME" as const, color: "#43a047", icon: "tag" };

async function useCategory(userId: string, categoryId: string) {
  const account = await db.account.create({
    data: { userId, name: "A", type: "CHECKING", color: "#1E88E5" },
  });
  await db.transaction.create({
    data: {
      userId,
      type: "EXPENSE",
      amountCents: 100,
      date: toDbDate("2026-11-10"),
      accountId: account.id,
      categoryId,
    },
  });
}

describe("categories service", () => {
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    userId = (await createUser()).id;
  });

  it("returns 404 for another user's parent", async () => {
    const other = await createUser();
    const parent = await createCategory(other.id, {
      ...expense,
      name: "Alheia",
    });
    await expect(
      createCategory(userId, {
        ...expense,
        name: "Filha",
        parentId: parent.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a parent of a different kind", async () => {
    const parent = await createCategory(userId, { ...income, name: "Salário" });
    await expect(
      createCategory(userId, { ...expense, name: "X", parentId: parent.id }),
    ).rejects.toMatchObject({
      status: 400,
      code: "CATEGORY_KIND_MISMATCH",
    });
  });

  it("allows only one level of subcategories", async () => {
    const parent = await createCategory(userId, {
      ...expense,
      name: "Alimentação",
    });
    const child = await createCategory(userId, {
      ...expense,
      name: "Restaurantes",
      parentId: parent.id,
    });
    await expect(
      createCategory(userId, { ...expense, name: "Neto", parentId: child.id }),
    ).rejects.toMatchObject({
      code: "CATEGORY_DEPTH",
    });
    const other = await createCategory(userId, { ...expense, name: "Lazer" });
    await expect(
      updateCategory(userId, parent.id, { parentId: other.id }),
    ).rejects.toMatchObject({
      code: "CATEGORY_DEPTH",
    });
  });

  it("refuses to change the kind of a category in use", async () => {
    const category = await createCategory(userId, {
      ...expense,
      name: "Mercado",
    });
    await useCategory(userId, category.id);
    await expect(
      updateCategory(userId, category.id, { kind: "INCOME" }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CATEGORY_IN_USE",
    });
  });

  it("archives used categories and deletes unused parents, orphaning children", async () => {
    const used = await createCategory(userId, { ...expense, name: "Usada" });
    await useCategory(userId, used.id);
    expect(await deleteCategory(userId, used.id)).toEqual({
      result: "archived",
    });

    const parent = await createCategory(userId, { ...expense, name: "Pai" });
    const child = await createCategory(userId, {
      ...expense,
      name: "Filha",
      parentId: parent.id,
    });
    expect(await deleteCategory(userId, parent.id)).toEqual({
      result: "deleted",
    });
    expect(
      (await db.category.findUniqueOrThrow({ where: { id: child.id } }))
        .parentId,
    ).toBeNull();
  });

  it("lists a filtered tree by kind", async () => {
    const parent = await createCategory(userId, {
      ...expense,
      name: "Alimentação",
    });
    await createCategory(userId, {
      ...expense,
      name: "Restaurantes",
      parentId: parent.id,
    });
    await createCategory(userId, { ...income, name: "Salário" });

    const tree = await listCategories(userId, { kind: "EXPENSE" });
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      name: "Alimentação",
      children: [{ name: "Restaurantes" }],
    });
  });

  it("assertCategoryUsable checks kind and archival", async () => {
    const category = await createCategory(userId, {
      ...expense,
      name: "Mercado",
    });
    await expect(
      assertCategoryUsable(userId, category.id, "INCOME"),
    ).rejects.toMatchObject({ code: "CATEGORY_KIND_MISMATCH" });
    await updateCategory(userId, category.id, { archived: true });
    await expect(
      assertCategoryUsable(userId, category.id, "EXPENSE"),
    ).rejects.toMatchObject({ code: "CATEGORY_ARCHIVED" });
  });
});
