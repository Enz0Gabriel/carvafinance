"use client";

import { LayoutDashboard, PieChart as PieIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  TransactionAmount,
  TransactionCategory,
} from "@/features/transactions/components/transaction-table";
import { useOpenTransactionDialog } from "@/features/transactions/components/transaction-dialog";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorState } from "@/shared/components/feedback/error-state";
import { Money } from "@/shared/components/money";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { usePeriodFilter } from "@/shared/hooks/use-period-filter";
import { useDashboard } from "../hooks/use-dashboard";
import {
  BalanceTrendChart,
  CashFlowChart,
  ExpensesByCategoryChart,
} from "./charts";
import { SummaryCards } from "./summary-cards";

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando dashboard"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const { range } = usePeriodFilter();
  const { data, isPending, isError, refetch, isPlaceholderData } =
    useDashboard(range);
  const openDialog = useOpenTransactionDialog();

  if (isPending) return <DashboardSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (data.accounts.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Comece cadastrando uma conta"
        description="Com uma conta criada você já pode registrar receitas, despesas e transferências."
        action={
          <Button asChild>
            <Link href="/accounts">Criar conta</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div
      className={
        isPlaceholderData
          ? "flex flex-col gap-6 opacity-60 transition-opacity"
          : "flex flex-col gap-6"
      }
    >
      <h1 className="sr-only">Dashboard</h1>
      <SummaryCards data={data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Fluxo de caixa (6 meses)" className="lg:col-span-2">
          <CashFlowChart data={data.cashFlow} />
        </Panel>
        <Panel title="Despesas por categoria">
          {data.expensesByCategory.length ? (
            <ExpensesByCategoryChart data={data.expensesByCategory} />
          ) : (
            <EmptyState icon={PieIcon} title="Sem despesas no período" />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Evolução do saldo" className="lg:col-span-2">
          <BalanceTrendChart data={data.balanceTrend} />
        </Panel>
        <Panel title="Saldo por conta">
          <ul className="flex flex-col gap-3">
            {data.accounts.map((account) => (
              <li key={account.id} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: account.color }}
                  aria-hidden
                />
                <span className="flex-1 truncate">{account.name}</span>
                <Money
                  cents={account.balanceCents}
                  colored
                  className="font-medium"
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Últimos lançamentos">
        {data.recent.length ? (
          <ul className="divide-y">
            {data.recent.map((tx) => (
              <li key={tx.id}>
                <button
                  type="button"
                  onClick={() => openDialog({ transaction: tx })}
                  className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-md py-2 text-left text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <TransactionCategory tx={tx} />
                  </span>
                  <span className="text-muted-foreground hidden truncate sm:block">
                    {tx.description}
                  </span>
                  <TransactionAmount tx={tx} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nenhum lançamento ainda.
          </p>
        )}
      </Panel>
    </div>
  );
}
