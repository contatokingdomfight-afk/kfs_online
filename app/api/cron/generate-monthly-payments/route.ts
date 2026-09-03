import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import {
  currentReferenceMonthLisbon,
  previousReferenceMonthLisbon,
} from "@/lib/lisbon-payment-dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMonthlyPayments } from "@/lib/renewals";

/**
 * Cron: gera mensalidades (Payment LATE) para o mês de referência.
 * Sem ?month= corre mês anterior + corrente (Lisboa).
 * Sem ?force=1, só gera após o fim do dia 8 em Lisboa (ou mês já ultrapassado) —
 * usado assim pelo cron diário `payment-suspension` como rede de segurança.
 * Com ?force=1 gera já (usado pelo cron do dia 1, mesma flag do botão manual em
 * Financeiro → Renovações). Idempotente: nunca duplica quem já tem Payment no mês.
 *
 * GET /api/cron/generate-monthly-payments
 * GET /api/cron/generate-monthly-payments?month=2025-03
 * GET /api/cron/generate-monthly-payments?force=1
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month")?.trim();
  const force = searchParams.get("force") === "1";
  const now = new Date();
  const months =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? [monthParam]
      : [previousReferenceMonthLisbon(now), currentReferenceMonthLisbon(now)];

  const supabase = createAdminClient();
  const results: { referenceMonth: string; created: number; skipped: number; error?: string }[] = [];

  for (const referenceMonth of months) {
    const result = await generateMonthlyPayments(supabase, referenceMonth, { now, force });
    results.push({ referenceMonth, ...result });
    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error, results },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    results,
  });
}
