import { formatBRL } from "@/domain/money";
import { cn } from "@/shared/lib/utils";

type MoneyProps = { cents: number; colored?: boolean; className?: string };

/** Formatted BRL amount; `colored` paints positives green and negatives red. */
export function Money({ cents, colored = false, className }: MoneyProps) {
  return (
    <span
      className={cn(
        "tabular-nums",
        colored && cents > 0 && "text-income",
        colored && cents < 0 && "text-expense",
        className,
      )}
    >
      {formatBRL(cents)}
    </span>
  );
}
