import { test, expect } from "@playwright/test";
import {
  createAuthOnlyStudent,
  deleteEphemeralStudent,
  ephemeralEmail,
  getTestPassword,
  hasSignupTestEnv,
} from "./helpers/ephemeral-student";

async function dismissInstallBanner(page: import("@playwright/test").Page) {
  const dismiss = page.getByRole("button", { name: /agora não|not now|×/i }).first();
  if (await dismiss.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dismiss.click();
  }
}

async function acceptCookiesIfVisible(page: import("@playwright/test").Page) {
  await dismissInstallBanner(page);
  const accept = page.getByRole("button", { name: /aceitar|accept|concordo|ok/i }).first();
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accept.click();
  }
}

async function completeOnboardingWizard(page: import("@playwright/test").Page) {
  const main = page.locator("main");
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 60_000 });
  await main.getByRole("button", { name: /começar|get started/i }).click();
  await main.locator('input[type="date"]').fill("1995-06-15");
  await main.getByRole("button", { name: /^próximo$|^next$/i }).click();
  await main.getByRole("button", { name: /^próximo$|^next$/i }).click();
  await main.getByRole("button", { name: /finalizar configuração|finish setup/i }).click();
}

test.describe("Cadastro de novos alunos", () => {
  test.setTimeout(120_000);
  test.skip(!hasSignupTestEnv(), "Definir NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e TEST_SEED_PASSWORD");

  test("sign-up UI — formulário aceita registo", async ({ page }) => {
    const email = ephemeralEmail();
    const password = getTestPassword();

    await page.goto("/sign-up");
    await acceptCookiesIfVisible(page);

    await page.getByPlaceholder(/nome completo|full name/i).fill("Aluno E2E Teste");
    await page.getByPlaceholder(/^email$|e-mail/i).fill(email);
    await page.getByPlaceholder(/senha|password|palavra-passe/i).fill(password);
    await page.locator('label input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /criar conta|create account/i }).click();

    await page.waitForURL(/\/(auth\/verify-email|onboarding|dashboard)/, { timeout: 60_000 });
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");

    await deleteEphemeralStudent(email);
  });

  test("login novo aluno → onboarding → finalizar (mobile)", async ({ page }) => {
    const email = ephemeralEmail();
    const password = getTestPassword();
    const fullName = "Aluno E2E Onboarding";

    await createAuthOnlyStudent(email, password, fullName);

    try {
      await page.goto("/sign-in");
      await acceptCookiesIfVisible(page);
      await page.getByPlaceholder(/email|e-mail/i).fill(email);
      await page.getByPlaceholder(/senha|password|palavra-passe/i).fill(password);
      await page.getByRole("button", { name: /^entrar$|^sign in$/i }).click();

      await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
      await page.goto("/onboarding");

      await completeOnboardingWizard(page);

      await page.waitForURL(
        (url) => !url.pathname.startsWith("/onboarding") && !url.pathname.startsWith("/sign-in"),
        { timeout: 60_000 }
      );

      const path = new URL(page.url()).pathname;
      expect(["/dashboard", "/escolher-plano", "/adesao"].some((p) => path === p || path.startsWith(`${p}/`))).toBe(
        true
      );
      await expect(page.locator("body")).not.toContainText("500");
    } finally {
      await deleteEphemeralStudent(email);
    }
  });
});
