import { expect, test, type Page } from "@playwright/test";
import { choose, register } from "./helpers";

async function createAccount(page: Page, name: string, balance: string) {
  await page.getByRole("button", { name: "Nova conta" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByLabel("Saldo inicial").fill(balance);
  await dialog.getByRole("button", { name: "Salvar conta" }).click();
  await expect(dialog).toBeHidden();
}

async function addTransaction(
  page: Page,
  type: "Despesa" | "Receita" | "Transferência",
  amount: string,
  fields: Record<string, string>,
) {
  await page.getByRole("button", { name: /Lançamento/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: type }).click();
  await dialog.getByLabel("Valor").fill(amount);
  for (const [label, option] of Object.entries(fields))
    await choose(page, label, option);
  await dialog.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(dialog).toBeHidden();
}

const card = (page: Page, title: string) =>
  page.locator("[data-slot=card]").filter({ hasText: title }).first();

test("full finance flow: accounts, transactions, dashboard, period, export", async ({
  page,
}) => {
  await register(page);

  await page.goto("/accounts");
  await createAccount(page, "Corrente", "1.000,00");
  await createAccount(page, "Poupança", "");

  await addTransaction(page, "Receita", "500,00", {
    Conta: "Corrente",
    Categoria: "Salário",
  });
  await addTransaction(page, "Despesa", "200,00", {
    Conta: "Corrente",
    Categoria: "Alimentação",
  });
  await addTransaction(page, "Transferência", "300,00", {
    "Conta de origem": "Corrente",
    "Conta de destino": "Poupança",
  });

  await page.goto("/dashboard");
  await expect(card(page, "Saldo total")).toContainText("R$ 1.300,00");
  await expect(card(page, "Receitas")).toContainText("R$ 500,00");
  await expect(card(page, "Despesas")).toContainText("R$ 200,00");

  await page.goto("/accounts");
  await expect(card(page, "Corrente")).toContainText("R$ 1.000,00");
  await expect(card(page, "Poupança")).toContainText("R$ 300,00");

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Período anterior" }).click();
  await expect(card(page, "Receitas")).toContainText("R$ 0,00");

  await page.goto("/reports");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^carvafinance-/);
});
