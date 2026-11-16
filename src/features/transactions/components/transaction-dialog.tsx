"use client";

import { Plus } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useSaveTransaction } from "../hooks/use-transactions";
import type { TransactionDTO, TransactionType } from "../schemas";
import { TransactionForm } from "./transaction-form";

type DialogState = {
  transaction?: TransactionDTO;
  type?: TransactionType;
} | null;

const TransactionDialogContext = createContext<
  (state: NonNullable<DialogState>) => void
>(() => {});

/** Opens the create/edit transaction dialog from anywhere inside the provider. */
export const useOpenTransactionDialog = () =>
  useContext(TransactionDialogContext);

export function TransactionDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<DialogState>(null);
  const save = useSaveTransaction();
  const editing = state?.transaction;

  return (
    <TransactionDialogContext.Provider value={setState}>
      {children}
      <Dialog
        open={state !== null}
        onOpenChange={(open) => !open && setState(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar lançamento" : "Novo lançamento"}
            </DialogTitle>
          </DialogHeader>
          {state !== null && (
            <TransactionForm
              key={editing?.id ?? "new"}
              transaction={editing}
              defaultType={state.type}
              pending={save.isPending}
              onSubmit={(data) =>
                save.mutate(
                  { id: editing?.id, data },
                  { onSuccess: () => setState(null) },
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </TransactionDialogContext.Provider>
  );
}

export function NewTransactionButton() {
  const open = useOpenTransactionDialog();
  return (
    <Button onClick={() => open({})}>
      <Plus className="size-4" aria-hidden />
      <span className="hidden sm:inline">Lançamento</span>
      <span className="sr-only sm:hidden">Novo lançamento</span>
    </Button>
  );
}
