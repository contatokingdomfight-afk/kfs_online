import { test, expect } from "@playwright/test";

test.describe("/dev/silhueta-2d", () => {
  test("mostra o playground quando a rota está disponível", async ({ page }) => {
    const res = await page.goto("/dev/silhueta-2d", { waitUntil: "domcontentloaded" });
    if (res?.status() === 404) {
      test.skip(true, "Rota desactivada (ex.: VERCEL_ENV=production) ou servidor sem esta build.");
    }
    await expect(page.getByRole("heading", { name: /silhueta 2d/i })).toBeVisible({ timeout: 20_000 });
  });
});
