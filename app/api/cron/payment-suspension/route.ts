import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import {
  currentReferenceMonthLisbon,
  previousReferenceMonthLisbon,
} from "@/lib/lisbon-payment-dates";
import { suspendStudentsPastGrace, startGraceForOverdueTuition } from "@/lib/payment-grace";
import { resumeDuePauses } from "@/lib/tuition-pause.server";
import { generateMonthlyPayments } from "@/lib/renewals";
import { syncAllStudentPaymentStatuses } from "@/lib/student-payment-status";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron: (0) retoma pausas com regresso previsto; (1) gera mensalidades por pagar (mês corrente e anterior);
 * (1b) começa a tolerância de quem passou o dia de pagamento;
 * (2) suspende alunos sem PAID após o fim do prazo (dia de pagamento + 15 dias corridos) em Lisboa.
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
  const pauses = await resumeDuePauses(supabase);
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

  const grace = await startGraceForOverdueTuition(supabase);
  const { suspended, errors } = await suspendStudentsPastGrace(supabase);
  const statusSync = await syncAllStudentPaymentStatuses(supabase);

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: true, pauses, generated, grace, suspended, statusSync, warnings: errors },
      { status: 207 }
    );
  }

  return NextResponse.json({ ok: true, pauses, generated, grace, suspended, statusSync });
}
