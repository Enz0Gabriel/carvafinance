import { chromium } from "@playwright/test";

/** Captures README screenshots from a running app (`docker compose up`) using the demo account. */
async function main() {
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
  });

  await page.goto(`${baseURL}/login`);
  await page.screenshot({ path: "docs/screenshots/login.png" });
  await page.getByRole("button", { name: "Entrar como demo" }).click();
  await page.waitForURL(/dashboard/);
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: "docs/screenshots/dashboard.png",
    fullPage: true,
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: "docs/screenshots/dashboard-dark.png",
    fullPage: true,
  });
  await page.evaluate(() => localStorage.setItem("theme", "light"));

  for (const [route, file] of [
    ["/transactions", "transactions"],
    ["/reports", "reports"],
  ] as const) {
    await page.goto(`${baseURL}${route}`);
    await page.waitForTimeout(3500);
    await page.screenshot({
      path: `docs/screenshots/${file}.png`,
      fullPage: true,
    });
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
