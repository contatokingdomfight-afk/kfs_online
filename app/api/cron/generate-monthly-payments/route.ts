import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMonthlyPayments } from "@/lib/renewals";

/**
 * Cron: gera mensalidades (Payment LATE) para o mês indicado.
 * Alunos com plano que ainda não têm pagamento no mês recebem um registo.
 *
 * Chamar no início do mês (ex.: dia 1) com:
 *   Authorization: Bearer <CRON_SECRET>
 * ou header x-vercel-cron: 1 (Vercel Cron).
 *
 * GET /api/cron/generate-monthly-payments
 * GET /api/cron/generate-monthly-payments?month=2025-03
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const authorized = isVercelCron || (secret && authHeader === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month")?.trim();
  const now = new Date();
  const referenceMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const supabase = createAdminClient();
  const result = await generateMonthlyPayments(supabase, referenceMonth);

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: result.error, created: result.created, skipped: result.skipped },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    referenceMonth,
    created: result.created,
    skipped: result.skipped,
  });
}
