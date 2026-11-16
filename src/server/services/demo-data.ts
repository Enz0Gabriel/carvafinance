import "server-only";
import { format } from "date-fns";
import { DEMO_CREDENTIALS } from "@/features/auth/demo";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { toDbDate } from "@/domain/period";

/** Small deterministic PRNG (mulberry32) so demo data is identical on every seed. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXPENSES: {
  category: string;
  descriptions: string[];
  min: number;
  max: number;
}[] = [
  {
    category: "Alimentação",
    descriptions: ["Supermercado", "Restaurante", "Padaria", "iFood"],
    min: 2500,
    max: 35000,
  },
  {
    category: "Transporte",
    descriptions: ["Combustível", "Uber", "Estacionamento"],
    min: 1500,
    max: 25000,
  },
  {
    category: "Lazer",
    descriptions: ["Cinema", "Streaming", "Show"],
    min: 2000,
    max: 20000,
  },
  {
    category: "Saúde",
    descriptions: ["Farmácia", "Consulta"],
    min: 3000,
    max: 30000,
  },
  {
    category: "Compras",
    descriptions: ["Roupas", "Eletrônicos", "Presente"],
    min: 5000,
    max: 60000,
  },
  {
    category: "Educação",
    descriptions: ["Curso online", "Livros"],
    min: 4000,
    max: 25000,
  },
];

/** Creates the public demo user with ~6 months of realistic data. Idempotent. */
export async function seedDemo(today: Date): Promise<{ created: boolean }> {
  const existing = await db.user.findUnique({
    where: { email: DEMO_CREDENTIALS.email },
  });
  if (existing) return { created: false };

  const { user } = await auth.api.signUpEmail({
    body: { name: "Usuário Demo", ...DEMO_CREDENTIALS },
  });
  const userId = user.id;

  const account = (
    name: string,
    type: "CHECKING" | "SAVINGS" | "WALLET" | "CREDIT_CARD",
    initialBalanceCents: number,
    color: string,
  ) =>
    db.account.create({
      data: { userId, name, type, initialBalanceCents, color },
    });
  const checking = await account(
    "Conta corrente",
    "CHECKING",
    250000,
    "#1E88E5",
  );
  const savings = await account("Poupança", "SAVINGS", 1000000, "#43A047");
  const wallet = await account("Carteira", "WALLET", 20000, "#FB8C00");
  const card = await account("Cartão de crédito", "CREDIT_CARD", 0, "#8E24AA");

  const categories = await db.category.findMany({ where: { userId } });
  const categoryId = (name: string, kind: "INCOME" | "EXPENSE") =>
    categories.find((c) => c.name === name && c.kind === kind)!.id;

  const rand = random(20261116);
  const between = (min: number, max: number) =>
    Math.round(min + rand() * (max - min));
  const todayKey = format(today, "yyyy-MM-dd");
  const data: Prisma.TransactionCreateManyInput[] = [];

  for (let offset = 5; offset >= 0; offset--) {
    const month = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const day = (d: number) =>
      format(new Date(month.getFullYear(), month.getMonth(), d), "yyyy-MM-dd");
    const push = (
      entry: Omit<Prisma.TransactionCreateManyInput, "userId" | "date"> & {
        date: string;
      },
    ) => {
      if (entry.date <= todayKey)
        data.push({ ...entry, userId, date: toDbDate(entry.date) });
    };

    push({
      type: "INCOME",
      amountCents: 650000,
      date: day(5),
      description: "Salário",
      accountId: checking.id,
      categoryId: categoryId("Salário", "INCOME"),
    });
    if (offset % 2 === 0) {
      push({
        type: "INCOME",
        amountCents: between(80000, 250000),
        date: day(18),
        description: "Projeto freelance",
        accountId: checking.id,
        categoryId: categoryId("Freelance", "INCOME"),
      });
    }
    push({
      type: "EXPENSE",
      amountCents: 180000,
      date: day(10),
      description: "Aluguel",
      accountId: checking.id,
      categoryId: categoryId("Moradia", "EXPENSE"),
    });
    push({
      type: "TRANSFER",
      amountCents: 50000,
      date: day(6),
      description: "Reserva mensal",
      accountId: checking.id,
      toAccountId: savings.id,
    });

    let cardSpend = 0;
    for (let i = 0; i < 15; i++) {
      const group = EXPENSES[Math.floor(rand() * EXPENSES.length)];
      const amountCents = between(group.min, group.max);
      // Small purchases come from the wallet, the rest from checking or the credit card.
      const payWith =
        amountCents < 3000 ? wallet : rand() < 0.6 ? checking : card;
      const date = day(1 + Math.floor(rand() * 27));
      if (payWith === card && date <= todayKey) cardSpend += amountCents;
      push({
        type: "EXPENSE",
        amountCents,
        date,
        description:
          group.descriptions[Math.floor(rand() * group.descriptions.length)],
        accountId: payWith.id,
        categoryId: categoryId(group.category, "EXPENSE"),
      });
    }
    // The card bill is paid at month end, so only the current month stays open.
    if (cardSpend > 0) {
      push({
        type: "TRANSFER",
        amountCents: cardSpend,
        date: day(28),
        description: "Pagamento da fatura",
        accountId: checking.id,
        toAccountId: card.id,
      });
    }
    push({
      type: "TRANSFER",
      amountCents: 10000,
      date: day(2),
      description: "Saque",
      accountId: checking.id,
      toAccountId: wallet.id,
    });
  }

  await db.transaction.createMany({ data });
  return { created: true };
}
