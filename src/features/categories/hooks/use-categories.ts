"use client";

import { createResourceHooks } from "@/shared/hooks/use-resource";
import type {
  CategoryCreateInput,
  CategoryDTO,
  CategoryKind,
  CategoryUpdateInput,
} from "../schemas";

const hooks = createResourceHooks<
  CategoryDTO,
  CategoryCreateInput,
  CategoryUpdateInput
>("categories", {
  saved: "Categoria salva",
  archived: "Categoria arquivada (possui lançamentos)",
  deleted: "Categoria excluída",
});

export const useCategories = (
  opts: { kind?: CategoryKind; includeArchived?: boolean } = {},
) =>
  hooks.useList({
    ...(opts.kind ? { kind: opts.kind } : {}),
    ...(opts.includeArchived ? { includeArchived: "true" } : {}),
  });
export const useSaveCategory = hooks.useSave;
export const useDeleteCategory = hooks.useRemove;
