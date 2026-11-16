"use client";

import {
  Archive,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorState } from "@/shared/components/feedback/error-state";
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog";
import { Money } from "@/shared/components/money";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  useAccounts,
  useDeleteAccount,
  useSaveAccount,
} from "../hooks/use-accounts";
import { ACCOUNT_TYPE_LABELS, type AccountDTO } from "../schemas";
import { AccountForm } from "./account-form";

export function AccountList() {
  const [showArchived, setShowArchived] = useState(false);
  const { data, isPending, isError, refetch } = useAccounts({
    includeArchived: showArchived,
  });
  const save = useSaveAccount();
  const remove = useDeleteAccount();
  const [editing, setEditing] = useState<AccountDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<AccountDTO | null>(null);

  const openNew = () => setEditing("new");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
          <p className="text-muted-foreground text-sm">
            Onde seu dinheiro está guardado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowArchived((v) => !v)}>
            <Archive className="size-4" aria-hidden />
            {showArchived ? "Ocultar arquivadas" : "Mostrar arquivadas"}
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden />
            Nova conta
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta ainda"
          description="Cadastre sua conta corrente, poupança ou carteira para começar a registrar lançamentos."
          action={<Button onClick={openNew}>Criar conta</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((account) => (
            <li key={account.id}>
              <Card className="gap-0 py-0">
                <CardContent className="flex items-start gap-3 p-4">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: account.color }}
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {account.name}
                      </span>
                      {account.archived && (
                        <Badge variant="secondary">Arquivada</Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </span>
                    <Money
                      cents={account.balanceCents}
                      colored
                      className="text-xl font-semibold"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ações da conta ${account.name}`}
                      >
                        <MoreVertical className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(account)}>
                        <Pencil className="size-4" aria-hidden /> Editar
                      </DropdownMenuItem>
                      {account.archived ? (
                        <DropdownMenuItem
                          onSelect={() =>
                            save.mutate({
                              id: account.id,
                              data: { archived: false },
                            })
                          }
                        >
                          <Archive className="size-4" aria-hidden /> Desarquivar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleting(account)}
                        >
                          <Trash2 className="size-4" aria-hidden /> Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Nova conta" : "Editar conta"}
            </DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <AccountForm
              account={editing === "new" ? undefined : editing}
              pending={save.isPending}
              onSubmit={(values) =>
                save.mutate(
                  {
                    id: editing === "new" ? undefined : editing.id,
                    data: values,
                  },
                  { onSuccess: () => setEditing(null) },
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="Se a conta tiver lançamentos, ela será arquivada para preservar o histórico."
        confirmLabel="Excluir"
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
