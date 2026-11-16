"use client";

import { format, parseISO } from "date-fns";
import {
  ArrowLeftRight,
  MoreVertical,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { formatBRL } from "@/domain/money";
import { CategoryIcon } from "@/shared/components/category-icon";
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";
import type { TransactionDTO } from "../schemas";

/** Signed, colored amount: +income (green), -expense (red), neutral transfer. */
export function TransactionAmount({ tx }: { tx: TransactionDTO }) {
  const sign = tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : "";
  return (
    <span
      className={cn(
        "font-medium whitespace-nowrap tabular-nums",
        tx.type === "INCOME" && "text-income",
        tx.type === "EXPENSE" && "text-expense",
      )}
    >
      {sign}
      {formatBRL(tx.amountCents)}
    </span>
  );
}

export function TransactionCategory({ tx }: { tx: TransactionDTO }) {
  if (!tx.category) {
    return (
      <span className="flex items-center gap-2">
        <span className="bg-muted inline-flex size-8 items-center justify-center rounded-full">
          <ArrowLeftRight className="size-4" aria-hidden />
        </span>
        Transferência
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <CategoryIcon name={tx.category.icon} color={tx.category.color} />
      <span className="truncate">{tx.category.name}</span>
    </span>
  );
}

const accountLabel = (tx: TransactionDTO) =>
  tx.toAccount ? `${tx.account.name} → ${tx.toAccount.name}` : tx.account.name;

type TransactionTableProps = {
  items: TransactionDTO[];
  onEdit: (tx: TransactionDTO) => void;
  onDelete: (id: string) => void;
};

export function TransactionTable({
  items,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhum lançamento encontrado"
        description="Ajuste os filtros ou registre um novo lançamento."
      />
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="hidden lg:table-cell">Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="whitespace-nowrap">
                  {format(parseISO(tx.date), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {tx.description || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <TransactionCategory tx={tx} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {accountLabel(tx)}
                </TableCell>
                <TableCell className="text-right">
                  <TransactionAmount tx={tx} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ações do lançamento"
                      >
                        <MoreVertical className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(tx)}>
                        <Pencil className="size-4" aria-hidden /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleting(tx)}
                      >
                        <Trash2 className="size-4" aria-hidden /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir lançamento?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => deleting && onDelete(deleting.id)}
      />
    </>
  );
}
