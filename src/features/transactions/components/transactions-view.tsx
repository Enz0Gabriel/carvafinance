"use client";

import { ErrorState } from "@/shared/components/feedback/error-state";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTransactionFilters } from "../hooks/use-transaction-filters";
import {
  useDeleteTransaction,
  useTransactions,
} from "../hooks/use-transactions";
import { useOpenTransactionDialog } from "./transaction-dialog";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";

export function TransactionsView() {
  const { filters, setFilter } = useTransactionFilters();
  const { data, isPending, isError, refetch, isPlaceholderData } =
    useTransactions(filters);
  const remove = useDeleteTransaction();
  const openDialog = useOpenTransactionDialog();

  const first =
    data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const lastPage = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lançamentos</h1>
        <p className="text-muted-foreground text-sm">
          Receitas, despesas e transferências do período.
        </p>
      </div>

      <TransactionFilters filters={filters} setFilter={setFilter} />

      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div
          className={
            isPlaceholderData ? "opacity-60 transition-opacity" : undefined
          }
        >
          <TransactionTable
            items={data.items}
            onEdit={(transaction) => openDialog({ transaction })}
            onDelete={(id) => remove.mutate(id)}
          />
          {data.total > 0 && (
            <div className="flex items-center justify-between gap-2 pt-4 text-sm">
              <span className="text-muted-foreground">
                Mostrando {first}–{last} de {data.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setFilter("page", data.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= lastPage}
                  onClick={() => setFilter("page", data.page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
