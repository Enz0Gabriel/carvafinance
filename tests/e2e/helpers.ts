import { expect, type Page } from "@playwright/test";

export const uniqueEmail = () =>
  `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.dev`;

export async function register(page: Page, email = uniqueEmail()) {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Teste E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha12345");
  await page.getByLabel("Confirmar senha").fill("senha12345");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

/** Selects an option of a Radix Select identified by its label. */
export async function choose(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
