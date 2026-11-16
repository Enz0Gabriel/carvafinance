import { z } from "zod";

export const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "WALLET",
  "CREDIT_CARD",
  "INVESTMENT",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  WALLET: "Carteira",
  CREDIT_CARD: "Cartão de crédito",
  INVESTMENT: "Investimento",
};

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");

export const accountCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome")
    .max(60, "Use até 60 caracteres"),
  type: z.enum(ACCOUNT_TYPES),
  initialBalanceCents: z.number().int(),
  color: hexColor,
});

export const accountUpdateSchema = accountCreateSchema
  .partial()
  .extend({ archived: z.boolean().optional() });

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;

export type AccountDTO = {
  id: string;
  name: string;
  type: AccountType;
  initialBalanceCents: number;
  color: string;
  archived: boolean;
  balanceCents: number;
};
