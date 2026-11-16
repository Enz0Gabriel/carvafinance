"use client";

import { createResourceHooks } from "@/shared/hooks/use-resource";
import type {
  AccountCreateInput,
  AccountDTO,
  AccountUpdateInput,
} from "../schemas";

const hooks = createResourceHooks<
  AccountDTO,
  AccountCreateInput,
  AccountUpdateInput
>("accounts", {
  saved: "Conta salva",
  archived: "Conta arquivada (possui lançamentos)",
  deleted: "Conta excluída",
});

export const useAccounts = (opts: { includeArchived?: boolean } = {}) =>
  hooks.useList(opts.includeArchived ? { includeArchived: "true" } : {});
export const useSaveAccount = hooks.useSave;
export const useDeleteAccount = hooks.useRemove;
