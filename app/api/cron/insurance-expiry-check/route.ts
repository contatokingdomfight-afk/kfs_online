import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInsuranceExpiryAlertToAdmin } from "@/lib/notifications/email";
import { computeInsuranceStatus } from "@/lib/insurance-settings";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

const BATCH = 100;

/**
 * Cron semanal: lista alunos com seguro a expirar (≤30 dias) ou expirado; email ao admin.
 * GET /api/cron/insurance-expiry-check
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");

  const { data: coverages, error } = await supabase
    .from("StudentInsuranceCoverage")
    .select("studentId, covered, coverageStartDate, coverageEndDate")
    .eq("covered", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const needsAttention: { studentId: string; status: string; endDate: string | null }[] = [];

  for (const row of coverages ?? []) {
    const status = computeInsuranceStatus(
      {
        covered: Boolean(row.covered),
        coverageStartDate: (row.coverageStartDate as string | null) ?? null,
        coverageEndDate: (row.coverageEndDate as string | null) ?? null,
        policyReference: null,
        notes: null,
      },
      todayYmd
    );
    if (status === "expiring" || status === "expired") {
      needsAttention.push({
        studentId: row.studentId as string,
        status,
        endDate: (row.coverageEndDate as string | null) ?? null,
      });
    }
  }

  if (needsAttention.length === 0) {
    return NextResponse.json({ ok: true, message: "Nenhum seguro a renovar", count: 0 });
  }

  const studentIds = needsAttention.map((n) => n.studentId);
  const lines: string[] = [];

  for (let i = 0; i < studentIds.length; i += BATCH) {
    const batch = studentIds.slice(i, i + BATCH);
    const { data: students } = await supabase.from("Student").select("id, userId").in("id", batch);
    const userIds = [...new Set((students ?? []).map((s) => s.userId))];
    const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
    const userById = new Map((users ?? []).map((u) => [u.id, u]));

    for (const item of needsAttention.filter((n) => batch.includes(n.studentId))) {
      const st = (students ?? []).find((s) => s.id === item.studentId);
      const u = st ? userById.get(st.userId) : undefined;
      const label = item.status === "expired" ? "Expirado" : "A expirar";
      lines.push(
        `• ${u?.name || u?.email || item.studentId} — ${label}${item.endDate ? ` (fim: ${item.endDate})` : ""}`
      );
    }
  }

  const emailResult = await sendInsuranceExpiryAlertToAdmin(lines);
  if (emailResult.error) {
    return NextResponse.json({ error: emailResult.error, count: needsAttention.length }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: needsAttention.length, emailed: true });
}
