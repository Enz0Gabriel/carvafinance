import { ArrowDownRight, ArrowUpRight, Landmark, Scale } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatPercentChange } from "@/domain/balance";
import { Money } from "@/shared/components/money";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import type { DashboardDTO, Metric } from "../types";

type CardProps = {
  title: string;
  icon: LucideIcon;
  cents: number;
  colored?: boolean;
  metric?: Metric;
  /** For expenses, an increase is bad news. */
  increaseIsBad?: boolean;
};

function SummaryCard({
  title,
  icon: Icon,
  cents,
  colored,
  metric,
  increaseIsBad,
}: CardProps) {
  const change = metric?.changePct ?? null;
  const good =
    change !== null && change !== 0 && change > 0 !== !!increaseIsBad;
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>{title}</span>
          <Icon className="size-4" aria-hidden />
        </div>
        <Money
          cents={cents}
          colored={colored}
          className="text-2xl font-semibold"
        />
        {metric && (
          <p className="text-muted-foreground text-xs">
            <span
              className={cn(
                "font-medium",
                change !== null &&
                  change !== 0 &&
                  (good ? "text-income" : "text-expense"),
              )}
            >
              {formatPercentChange(change)}
            </span>{" "}
            vs. período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ data }: { data: DashboardDTO }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Saldo total"
        icon={Landmark}
        cents={data.totalBalanceCents}
        colored
      />
      <SummaryCard
        title="Receitas"
        icon={ArrowUpRight}
        cents={data.income.currentCents}
        metric={data.income}
      />
      <SummaryCard
        title="Despesas"
        icon={ArrowDownRight}
        cents={data.expense.currentCents}
        metric={data.expense}
        increaseIsBad
      />
      <SummaryCard
        title="Resultado"
        icon={Scale}
        cents={data.result.currentCents}
        colored
        metric={data.result}
      />
    </div>
  );
}
