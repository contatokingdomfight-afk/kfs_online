import { test, expect } from "@playwright/test";
import { hasAuthCreds, testEmail, testPassword } from "./helpers/env";

test.describe("Fluxos críticos autenticados", () => {
  test.skip(!hasAuthCreds, "Definir PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email|e-mail/i).fill(testEmail);
    await page.getByLabel(/password|palavra-passe|senha/i).fill(testPassword);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  });

  test("login → dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("dashboard → performance (avaliação)", async ({ page }) => {
    await page.goto("/dashboard/performance");
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("dashboard → biblioteca", async ({ page }) => {
    await page.goto("/dashboard/biblioteca");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("escolher plano (smoke redirect ou página)", async ({ page }) => {
    await page.goto("/escolher-plano");
    await expect(page.locator("body")).not.toContainText("500");
  });
});
