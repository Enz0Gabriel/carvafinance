import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("new user lands on an empty dashboard and can sign out", async ({
  page,
}) => {
  await register(page);
  await expect(page.getByText("Comece cadastrando uma conta")).toBeVisible();

  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("demo login shows a populated dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como demo" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const balance = page.getByText("Saldo total").locator("xpath=../..");
  await expect(balance).toContainText("R$");
  await expect(balance).not.toContainText("R$ 0,00");
});
