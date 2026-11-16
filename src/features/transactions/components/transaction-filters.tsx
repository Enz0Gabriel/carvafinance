"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { TransactionFilterKey } from "../hooks/use-transaction-filters";
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "../schemas";

const ALL = "__all__";

const SORT_LABELS = {
  date_desc: "Mais recentes",
  date_asc: "Mais antigos",
  amount_desc: "Maior valor",
  amount_asc: "Menor valor",
} as const;

type Filters = {
  type?: string;
  accountId?: string;
  categoryId?: string;
  q?: string;
  sort: string;
};

type Props = {
  filters: Filters;
  setFilter: (key: TransactionFilterKey, value: string | undefined) => void;
};

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => onChange(v === ALL ? undefined : v)}
    >
      <SelectTrigger aria-label={label} className="w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TransactionFilters({ filters, setFilter }: Props) {
  const accounts = useAccounts({ includeArchived: true });
  const categories = useCategories({ includeArchived: true });
  const [search, setSearch] = useState(filters.q ?? "");

  // Debounce the free-text search so the URL/query don't update on every keystroke.
  useEffect(() => {
    if (search === (filters.q ?? "")) return;
    const timer = setTimeout(
      () => setFilter("q", search.trim() || undefined),
      300,
    );
    return () => clearTimeout(timer);
  }, [search, filters.q, setFilter]);

  const categoryOptions = (categories.data ?? []).flatMap((parent) => [
    { value: parent.id, label: parent.name },
    ...parent.children.map((child) => ({
      value: child.id,
      label: `${parent.name} › ${child.name}`,
    })),
  ]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-64">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Buscar por descrição"
          placeholder="Buscar descrição..."
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <FilterSelect
        label="Tipo"
        value={filters.type}
        onChange={(v) => setFilter("type", v)}
        allLabel="Todos os tipos"
        options={TRANSACTION_TYPES.map((t) => ({
          value: t,
          label: TRANSACTION_TYPE_LABELS[t],
        }))}
      />
      <FilterSelect
        label="Conta"
        value={filters.accountId}
        onChange={(v) => setFilter("accountId", v)}
        allLabel="Todas as contas"
        options={(accounts.data ?? []).map((a) => ({
          value: a.id,
          label: a.name,
        }))}
      />
      <FilterSelect
        label="Categoria"
        value={filters.categoryId}
        onChange={(v) => setFilter("categoryId", v)}
        allLabel="Todas as categorias"
        options={categoryOptions}
      />
      <FilterSelect
        label="Ordenar por"
        value={filters.sort}
        onChange={(v) => setFilter("sort", v)}
        options={Object.entries(SORT_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
      />
    </div>
  );
}
