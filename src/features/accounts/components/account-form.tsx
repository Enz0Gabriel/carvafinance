"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ColorPicker, COLOR_OPTIONS } from "@/shared/components/color-picker";
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
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  accountCreateSchema,
  type AccountCreateInput,
  type AccountDTO,
} from "../schemas";

type AccountFormProps = {
  account?: AccountDTO;
  pending?: boolean;
  onSubmit: (data: AccountCreateInput) => void;
};

export function AccountForm({ account, pending, onSubmit }: AccountFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountCreateInput>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "CHECKING",
      initialBalanceCents: account?.initialBalanceCents ?? 0,
      color: account?.color ?? COLOR_OPTIONS[0],
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-name">Nome</Label>
        <Input
          id="account-name"
          placeholder="Ex.: Conta Nubank"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="account-type">Tipo</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="account-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="account-balance">Saldo inicial</Label>
        <Controller
          control={control}
          name="initialBalanceCents"
          render={({ field }) => (
            <MoneyInput
              id="account-balance"
              placeholder="0,00"
              value={field.value === 0 ? null : field.value}
              onChange={(cents) => field.onChange(cents ?? 0)}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor</Label>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <ColorPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar conta"}
      </Button>
    </form>
  );
}
