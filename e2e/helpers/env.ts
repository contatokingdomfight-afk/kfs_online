export const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
export const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";
export const hasAuthCreds = Boolean(testEmail && testPassword);

export const productionBase = process.env.PLAYWRIGHT_BASE_URL ?? "https://kingdomfight.com";
