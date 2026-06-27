import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import {
  currentReferenceMonthLisbon,
  previousReferenceMonthLisbon,
} from "@/lib/lisbon-payment-dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMonthlyPayments } from "@/lib/renewals";

/**
 * Cron opcional: gera mensalidades (Payment LATE) após o 5.º dia útil em Lisboa
 * (ou recupera meses já ultrapassados). Sem ?month= corre mês anterior + corrente (Lisboa).
 *
 * GET /api/cron/generate-monthly-payments
 * GET /api/cron/generate-monthly-payments?month=2025-03
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month")?.trim();
  const now = new Date();
  const months =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? [monthParam]
      : [previousReferenceMonthLisbon(now), currentReferenceMonthLisbon(now)];

  const supabase = createAdminClient();
  const results: { referenceMonth: string; created: number; skipped: number; error?: string }[] = [];

  for (const referenceMonth of months) {
    const result = await generateMonthlyPayments(supabase, referenceMonth, { now });
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
