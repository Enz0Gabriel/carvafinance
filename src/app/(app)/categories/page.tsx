import type { Metadata } from "next";
import { CategoryList } from "@/features/categories/components/category-list";

export const metadata: Metadata = { title: "Categorias" };

export default function CategoriesPage() {
  return <CategoryList />;
}
