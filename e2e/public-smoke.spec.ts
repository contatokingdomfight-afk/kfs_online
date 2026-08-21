import { test, expect } from "@playwright/test";
import { productionBase } from "./helpers/env";

test.describe("Smoke público", () => {
  test("homepage carrega", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Kingdom/i);
  });

  test("sign-in carrega", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /entrar|sign in/i })).toBeVisible();
  });

  test("manifest PWA existe", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Lighthouse URL alvo (manual/CI)", () => {
  test("base de produção documentada responde", async ({ request }) => {
    test.skip(!process.env.CI, "Só em CI com PLAYWRIGHT_BASE_URL");
    const res = await request.get(productionBase, { maxRedirects: 5 });
    expect(res.status()).toBeLessThan(500);
  });
});
