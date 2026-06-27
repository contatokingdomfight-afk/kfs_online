function isProductionEnv(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/** Bloqueia seeds destrutivos em produção salvo ALLOW_PRODUCTION_SEED=true. */
export function blockProductionSeed(): string | null {
  if (isProductionEnv() && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    return "Operação de seed bloqueada em produção.";
  }
  return null;
}
