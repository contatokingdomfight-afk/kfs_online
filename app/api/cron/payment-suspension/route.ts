import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import {
  currentReferenceMonthLisbon,
  previousReferenceMonthLisbon,
} from "@/lib/lisbon-payment-dates";
import { suspendStudentsPastGrace } from "@/lib/payment-grace";
import { generateMonthlyPayments } from "@/lib/renewals";
import { syncAllStudentPaymentStatuses } from "@/lib/student-payment-status";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron: (1) gera registos LATE após o 5.º dia útil (mês corrente e anterior em Lisboa);
 * (2) suspende alunos sem PAID após o fim do dia civil 10 em Lisboa.
 * Coloca planId a null, guarda o plano em suspendedPlanId e cancela subscrição Stripe se existir.
 *
 * Authorization: Bearer <CRON_SECRET> ou x-vercel-cron: 1
 *
 * GET /api/cron/payment-suspension
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const months = [previousReferenceMonthLisbon(now), currentReferenceMonthLisbon(now)];
  const generated: {
    referenceMonth: string;
    created: number;
    skipped: number;
    error?: string;
  }[] = [];

  for (const referenceMonth of months) {
    const result = await generateMonthlyPayments(supabase, referenceMonth, { now });
    generated.push({ referenceMonth, ...result });
  }

  const genError = generated.find((g) => g.error)?.error;
  if (genError) {
    return NextResponse.json(
      { ok: false, error: genError, generated },
      { status: 500 }
    );
  }

  const { suspended, errors } = await suspendStudentsPastGrace(supabase);
  const statusSync = await syncAllStudentPaymentStatuses(supabase);

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: true, generated, suspended, statusSync, warnings: errors },
      { status: 207 }
    );
  }

  return NextResponse.json({ ok: true, generated, suspended, statusSync });
}
