"use client";

import { format } from "date-fns";
import { useState, type FormEvent, type ReactNode } from "react";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { useCategories } from "@/features/categories/hooks/use-categories";
import type { CategoryDTO } from "@/features/categories/schemas";
import { MoneyInput } from "@/shared/components/money-input";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import {
  TRANSACTION_TYPE_LABELS,
  transactionInputSchema,
  type TransactionDTO,
  type TransactionInput,
  type TransactionType,
} from "../schemas";

type Draft = {
  type: TransactionType;
  amountCents: number | null;
  date: string;
  description: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
};

type Errors = Partial<Record<keyof Draft, string>>;

const toDraft = (
  tx: TransactionDTO | undefined,
  type: TransactionType,
): Draft => ({
  type: tx?.type ?? type,
  amountCents: tx?.amountCents ?? null,
  date: tx?.date ?? format(new Date(), "yyyy-MM-dd"),
  description: tx?.description ?? "",
  accountId: tx?.account.id ?? "",
  toAccountId: tx?.toAccount?.id ?? "",
  categoryId: tx?.category?.id ?? "",
});

function toInput(draft: Draft): unknown {
  const common = {
    type: draft.type,
    amountCents: draft.amountCents ?? 0,
    date: draft.date,
    description: draft.description,
    accountId: draft.accountId,
  };
  return draft.type === "TRANSFER"
    ? { ...common, toAccountId: draft.toAccountId }
    : { ...common, categoryId: draft.categoryId };
}

/** Flattens a category tree into select options ("Pai › Filha"). */
function categoryOptions(tree: CategoryDTO[]) {
  return tree.flatMap((parent) => [
    { id: parent.id, label: parent.name },
    ...parent.children.map((child) => ({
      id: child.id,
      label: `${parent.name} › ${child.name}`,
    })),
  ]);
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

type Option = { id: string; label: string };

function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  invalid: boolean;
}) {
  return (
    // Keep it controlled: "" shows the placeholder (undefined would keep the stale label).
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Keeps an archived account/category selectable when editing an existing transaction. */
function withArchivedFallback(
  options: Option[],
  ...refs: ({ id: string; name: string } | null | undefined)[]
): Option[] {
  const result = [...options];
  for (const ref of refs) {
    if (ref && !result.some((opt) => opt.id === ref.id)) {
      result.push({ id: ref.id, label: `${ref.name} (arquivada)` });
    }
  }
  return result;
}

type TransactionFormProps = {
  transaction?: TransactionDTO;
  defaultType?: TransactionType;
  pending?: boolean;
  onSubmit: (data: TransactionInput) => void;
};

export function TransactionForm({
  transaction,
  defaultType = "EXPENSE",
  pending,
  onSubmit,
}: TransactionFormProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    toDraft(transaction, defaultType),
  );
  const [errors, setErrors] = useState<Errors>({});
  const accounts = useAccounts();
  const categories = useCategories({
    kind: draft.type === "INCOME" ? "INCOME" : "EXPENSE",
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const baseAccounts = (accounts.data ?? []).map((a) => ({
    id: a.id,
    label: a.name,
  }));
  const accountOptions = withArchivedFallback(
    baseAccounts,
    transaction?.account,
    transaction?.toAccount,
  );
  const baseCategories = categoryOptions(categories.data ?? []);
  const categorySelectOptions = withArchivedFallback(
    baseCategories,
    transaction && transaction.type === draft.type
      ? transaction.category
      : null,
  );
  const isTransfer = draft.type === "TRANSFER";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = transactionInputSchema.safeParse(toInput(draft));
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Draft;
        // Empty selects get a friendlier message than Zod's generic one.
        next[key] ??=
          draft[key] === "" && key !== "description"
            ? "Selecione uma opção"
            : issue.message;
      }
      setErrors(next);
      return;
    }
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <ToggleGroup
        type="single"
        variant="outline"
        value={draft.type}
        onValueChange={(value) => {
          if (!value) return;
          setDraft((current) => ({
            ...current,
            type: value as TransactionType,
            categoryId: "",
          }));
          setErrors({});
        }}
        aria-label="Tipo de lançamento"
        className="w-full"
      >
        {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((type) => (
          <ToggleGroupItem key={type} value={type} className="flex-1">
            {TRANSACTION_TYPE_LABELS[type]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tx-amount" label="Valor" error={errors.amountCents}>
          <MoneyInput
            id="tx-amount"
            value={draft.amountCents}
            onChange={(cents) => set("amountCents", cents)}
            aria-invalid={!!errors.amountCents}
            aria-describedby={
              errors.amountCents ? "tx-amount-error" : undefined
            }
          />
        </Field>
        <Field id="tx-date" label="Data" error={errors.date}>
          <Input
            id="tx-date"
            type="date"
            value={draft.date}
            onChange={(event) => set("date", event.target.value)}
            aria-invalid={!!errors.date}
          />
        </Field>
      </div>

      <Field
        id="tx-account"
        label={isTransfer ? "Conta de origem" : "Conta"}
        error={errors.accountId}
      >
        <OptionSelect
          id="tx-account"
          value={draft.accountId}
          onChange={(value) => set("accountId", value)}
          options={accountOptions}
          placeholder="Selecione a conta"
          invalid={!!errors.accountId}
        />
      </Field>

      {isTransfer ? (
        <Field
          id="tx-to-account"
          label="Conta de destino"
          error={errors.toAccountId}
        >
          <OptionSelect
            id="tx-to-account"
            value={draft.toAccountId}
            onChange={(value) => set("toAccountId", value)}
            options={accountOptions}
            placeholder="Selecione a conta"
            invalid={!!errors.toAccountId}
          />
        </Field>
      ) : (
        <Field id="tx-category" label="Categoria" error={errors.categoryId}>
          <OptionSelect
            id="tx-category"
            value={draft.categoryId}
            onChange={(value) => set("categoryId", value)}
            options={categorySelectOptions}
            placeholder="Selecione a categoria"
            invalid={!!errors.categoryId}
          />
        </Field>
      )}

      <Field
        id="tx-description"
        label="Descrição (opcional)"
        error={errors.description}
      >
        <Input
          id="tx-description"
          maxLength={120}
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar lançamento"}
      </Button>
    </form>
  );
}
