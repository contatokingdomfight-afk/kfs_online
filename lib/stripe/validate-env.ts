function isProductionEnv(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/** Em produção, regista erro se variáveis Stripe obrigatórias faltarem. */
export function assertStripeEnvInProduction(): void {
  if (!isProductionEnv()) return;

  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY?.trim()) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) missing.push("STRIPE_WEBHOOK_SECRET");

  if (missing.length > 0) {
    console.error(`[stripe] Variáveis em falta em produção: ${missing.join(", ")}`);
  }
}
