import "server-only";
import type { CategoryKind } from "@/generated/prisma/client";
import { db } from "@/server/db";

type DefaultCategory = {
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
};

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Alimentação", kind: "EXPENSE", color: "#ef6c00", icon: "utensils" },
  { name: "Moradia", kind: "EXPENSE", color: "#6d4c41", icon: "house" },
  { name: "Transporte", kind: "EXPENSE", color: "#3949ab", icon: "car" },
  { name: "Saúde", kind: "EXPENSE", color: "#e53935", icon: "heart-pulse" },
  {
    name: "Educação",
    kind: "EXPENSE",
    color: "#8e24aa",
    icon: "graduation-cap",
  },
  { name: "Lazer", kind: "EXPENSE", color: "#00acc1", icon: "gamepad-2" },
  { name: "Compras", kind: "EXPENSE", color: "#d81b60", icon: "shopping-bag" },
  { name: "Outros", kind: "EXPENSE", color: "#757575", icon: "tag" },
  { name: "Salário", kind: "INCOME", color: "#43a047", icon: "briefcase" },
  { name: "Freelance", kind: "INCOME", color: "#00897b", icon: "laptop" },
  {
    name: "Investimentos",
    kind: "INCOME",
    color: "#1e88e5",
    icon: "trending-up",
  },
  { name: "Outros", kind: "INCOME", color: "#757575", icon: "tag" },
];

export async function createDefaultCategories(userId: string): Promise<void> {
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })),
  });
}
