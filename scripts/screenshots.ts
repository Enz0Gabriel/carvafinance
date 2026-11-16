import { chromium, type Page } from "@playwright/test";

/** Captures README screenshots from a running app (`docker compose up`) using the demo account. */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";

async function shot(page: Page, name: string, fullPage = true) {
  await page.waitForTimeout(3500); // let data load and chart animations finish
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
  });

  await page.goto(`${baseURL}/login`);
  await shot(page, "login", false);
  await page.getByRole("button", { name: "Entrar como demo" }).click();
  await page.waitForURL(/dashboard/);
  await shot(page, "dashboard");

  for (const [route, name] of [
    ["/transactions", "transactions"],
    ["/accounts", "accounts"],
    ["/categories", "categories"],
    ["/reports", "reports"],
  ] as const) {
    await page.goto(`${baseURL}${route}`);
    await shot(page, name);
  }

  await page.goto(`${baseURL}/transactions`);
  await page.getByRole("button", { name: /Lançamento/ }).click();
  await shot(page, "new-transaction", false);
  await page.keyboard.press("Escape");

  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.goto(`${baseURL}/dashboard`);
  await shot(page, "dashboard-dark");
  await page.evaluate(() => localStorage.setItem("theme", "light"));

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
  });
  await mobile.context().addCookies(await page.context().cookies());
  await mobile.goto(`${baseURL}/dashboard`);
  await shot(mobile, "mobile", false);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
