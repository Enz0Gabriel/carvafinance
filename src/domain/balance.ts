export type BalanceParts = {
  initialCents: number;
  incomeCents: number;
  expenseCents: number;
  transferOutCents: number;
  transferInCents: number;
};

export function computeBalance(p: BalanceParts): number {
  return (
    p.initialCents +
    p.incomeCents -
    p.expenseCents -
    p.transferOutCents +
    p.transferInCents
  );
}

/** Percent change rounded to 1 decimal; null when there is no previous value to compare. */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

const PERCENT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function formatPercentChange(value: number | null): string {
  return value === null ? "—" : `${PERCENT_FORMATTER.format(value)}%`;
}
