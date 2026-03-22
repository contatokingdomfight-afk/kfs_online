import { NextRequest, NextResponse } from "next/server";
import { suspendStudentsPastGrace } from "@/lib/payment-grace";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron: suspende alunos cujo prazo de 5 dias úteis após mensalidade em atraso expirou.
 * Coloca planId a null (experiência de novo utilizador), guarda o plano em suspendedPlanId
 * e cancela subscrição Stripe se existir.
 *
 * Authorization: Bearer <CRON_SECRET> ou x-vercel-cron: 1
 *
 * GET /api/cron/payment-suspension
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const authorized = isVercelCron || (secret && authHeader === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { suspended, errors } = await suspendStudentsPastGrace(supabase);

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: true, suspended, warnings: errors },
      { status: 207 }
    );
  }

  return NextResponse.json({ ok: true, suspended });
}
