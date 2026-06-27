import type { NextRequest } from "next/server";

function isProductionEnv(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Autoriza pedidos a /api/cron/*.
 * Em produção exige CRON_SECRET definido; aceita Bearer ou header x-vercel-cron (Vercel Cron).
 */
export function authorizeCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET?.trim();

  if (isProductionEnv() && !secret) {
    return false;
  }

  return isVercelCron || (Boolean(secret) && authHeader === `Bearer ${secret}`);
}
