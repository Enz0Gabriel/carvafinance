"use client";

import { useState, type ComponentProps } from "react";
import { parseMoneyInput } from "@/domain/money";
import { Input } from "@/shared/components/ui/input";

const DECIMAL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const toText = (cents: number | null) =>
  cents === null ? "" : DECIMAL.format(cents / 100);

type MoneyInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: number | null;
  onChange: (cents: number | null) => void;
};

/** BRL amount input: accepts pt-BR typing ("1.234,56") and reports integer cents (or null). */
export function MoneyInput({
  value,
  onChange,
  onBlur,
  ...props
}: MoneyInputProps) {
  const [text, setText] = useState(() => toText(value));
  const [lastValue, setLastValue] = useState(value);

  // Sync when the parent resets/changes the value (e.g. form reset).
  if (value !== lastValue) {
    setLastValue(value);
    if (value !== parseMoneyInput(text)) setText(toText(value));
  }

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
        R$
      </span>
      <Input
        {...props}
        inputMode="decimal"
        className="pl-9"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          const cents = parseMoneyInput(next);
          setText(next);
          setLastValue(cents);
          onChange(cents);
        }}
        onBlur={(event) => {
          if (value !== null) setText(toText(value));
          onBlur?.(event);
        }}
      />
    </div>
  );
}
