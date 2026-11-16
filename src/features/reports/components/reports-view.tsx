"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileBarChart } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CashFlowChart } from "@/features/dashboard/components/charts";
import { TransactionTable } from "@/features/transactions/components/transaction-table";
import { useOpenTransactionDialog } from "@/features/transactions/components/transaction-dialog";
import {
  useDeleteTransaction,
  useTransactions,
} from "@/features/transactions/hooks/use-transactions";
import type { CategoryKind } from "@/features/categories/schemas";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorState } from "@/shared/components/feedback/error-state";
import { Money } from "@/shared/components/money";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import { usePeriodFilter } from "@/shared/hooks/use-period-filter";
import {
  exportUrl,
  useAccountReport,
  useCategoryReport,
  useMonthlyReport,
} from "../hooks/use-reports";
import { CategoryReport } from "./category-report";

type QueryState<T> = {
  data?: T;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
};

/** Shared loading / error / empty handling for report tabs. */
function ReportState<T extends unknown[]>({
  query,
  children,
}: {
  query: QueryState<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <Skeleton className="h-64 rounded-xl" />;
  if (query.isError || !query.data)
    return <ErrorState onRetry={() => query.refetch()} />;
  if (query.data.length === 0)
    return <EmptyState icon={FileBarChart} title="Sem dados no período" />;
  return <>{children(query.data)}</>;
}

const monthName = (month: string) =>
  format(parseISO(`${month}-01`), "MMMM yyyy", { locale: ptBR });

function MonthlyTab() {
  const { range } = usePeriodFilter();
  const query = useMonthlyReport(range);
  return (
    <ReportState query={query}>
      {(rows) => (
        <div className="flex flex-col gap-4">
          <CashFlowChart data={rows} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="capitalize">
                    {monthName(row.month)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={row.incomeCents} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={row.expenseCents} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={row.resultCents} colored />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ReportState>
  );
}

function CategoriesTab() {
  const { range } = usePeriodFilter();
  const [kind, setKind] = useState<CategoryKind>("EXPENSE");
  const query = useCategoryReport(range, kind);
  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        value={kind}
        onValueChange={(v) => v && setKind(v as CategoryKind)}
        aria-label="Tipo de categoria"
      >
        <ToggleGroupItem value="EXPENSE">Despesas</ToggleGroupItem>
        <ToggleGroupItem value="INCOME">Receitas</ToggleGroupItem>
      </ToggleGroup>
      <ReportState query={query}>
        {(rows) => <CategoryReport rows={rows} />}
      </ReportState>
    </div>
  );
}

function AccountsTab() {
  const { range } = usePeriodFilter();
  const query = useAccountReport(range);
  return (
    <ReportState query={query}>
      {(rows) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Saldo atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden
                    />
                    {row.name}
                  </span>
                </TableCell>
                <TableCell className="text-income text-right">
                  <Money cents={row.inflowCents} />
                </TableCell>
                <TableCell className="text-expense text-right">
                  <Money cents={row.outflowCents} />
                </TableCell>
                <TableCell className="text-right">
                  <Money cents={row.balanceCents} colored />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ReportState>
  );
}

function StatementTab() {
  const { range } = usePeriodFilter();
  const query = useTransactions({ ...range, pageSize: 100, sort: "date_asc" });
  const remove = useDeleteTransaction();
  const openDialog = useOpenTransactionDialog();
  if (query.isPending) return <Skeleton className="h-64 rounded-xl" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  return (
    <div className="flex flex-col gap-2">
      <TransactionTable
        items={query.data.items}
        onEdit={(transaction) => openDialog({ transaction })}
        onDelete={(id) => remove.mutate(id)}
      />
      {query.data.total > query.data.items.length && (
        <p className="text-muted-foreground text-sm">
          Mostrando {query.data.items.length} de {query.data.total}. Exporte o
          CSV para ver todos.
        </p>
      )}
    </div>
  );
}

export function ReportsView() {
  const { range } = usePeriodFilter();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground text-sm">
            Análises do período selecionado.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={exportUrl(range)} download>
            <Download className="size-4" aria-hidden />
            Exportar CSV
          </a>
        </Button>
      </div>
      <Card>
        <CardContent>
          <Tabs defaultValue="monthly" className="gap-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="monthly">Resumo mensal</TabsTrigger>
              <TabsTrigger value="categories">Por categoria</TabsTrigger>
              <TabsTrigger value="accounts">Por conta</TabsTrigger>
              <TabsTrigger value="statement">Extrato</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">
              <MonthlyTab />
            </TabsContent>
            <TabsContent value="categories">
              <CategoriesTab />
            </TabsContent>
            <TabsContent value="accounts">
              <AccountsTab />
            </TabsContent>
            <TabsContent value="statement">
              <StatementTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
