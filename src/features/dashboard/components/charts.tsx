"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/domain/money";
import type { MonthTotals } from "@/domain/reports";
import type { CategoryTotal } from "../types";

const COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const axisMoney = (cents: number) => COMPACT.format(cents / 100);
const monthLabel = (month: string) =>
  format(parseISO(`${month}-01`), "MMM", { locale: ptBR });
const tooltipMoney = (value: unknown) => formatBRL(Number(value));
const AXIS = { fontSize: 12, stroke: "var(--muted-foreground)" };

export function CashFlowChart({ data }: { data: MonthTotals[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="var(--border)"
        />
        <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
        <YAxis tickFormatter={axisMoney} width={72} {...AXIS} />
        <Tooltip
          formatter={tooltipMoney}
          labelFormatter={(m) => monthLabel(String(m))}
        />
        <Legend />
        <Bar
          dataKey="incomeCents"
          name="Receitas"
          fill="var(--income)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="expenseCents"
          name="Despesas"
          fill="var(--expense)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BalanceTrendChart({
  data,
}: {
  data: { month: string; balanceCents: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="var(--border)"
        />
        <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
        <YAxis tickFormatter={axisMoney} width={72} {...AXIS} />
        <Tooltip
          formatter={tooltipMoney}
          labelFormatter={(m) => monthLabel(String(m))}
        />
        <Line
          type="monotone"
          dataKey="balanceCents"
          name="Saldo"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExpensesByCategoryChart({ data }: { data: CategoryTotal[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="totalCents"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.categoryId} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipMoney} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-col gap-2 text-sm">
        {data.map((entry) => (
          <li key={entry.categoryId} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="text-muted-foreground tabular-nums">
              {entry.share.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
              })}
              %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
