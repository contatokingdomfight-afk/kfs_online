import type { SupabaseClient } from "@supabase/supabase-js";
import { applySchoolFeeOverrides, getInsuranceSettings, type SchoolFeeOverrides } from "@/lib/insurance-settings";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

/**
 * Alinha pagamentos de seguro em LATE ao valor actual: o da escola do aluno (SchoolPaymentSettings)
 * ou, sem valor próprio, o da rede em Admin → Configurações.
 * Evita mostrar 25 € (ou outro valor antigo) quando o valor do seguro já mudou.
 */
export async function syncPendingInsuranceAmounts(
  supabase: SupabaseClient,
  options?: { studentId?: string; studentIds?: string[]; referenceYear?: string }
): Promise<{ updated: number }> {
  if (options?.studentIds && options.studentIds.length === 0) return { updated: 0 };
  const referenceYear = options?.referenceYear ?? String(new Date().getFullYear());

  let query = supabase
    .from("Payment")
    .select("id, amount, studentId")
    .eq("paymentType", "INSURANCE")
    .eq("referenceYear", referenceYear)
    .eq("status", "LATE");

  if (options?.studentId) {
    query = query.eq("studentId", options.studentId);
  }
  if (options?.studentIds) {
    query = query.in("studentId", options.studentIds);
  }

  const { data: rows, error } = await query;
  if (error || !rows?.length) return { updated: 0 };

  const payments = rows as { id: string; amount: number | string; studentId: string }[];
  const studentIds = [...new Set(payments.map((p) => p.studentId))];
  // SchoolPaymentSettings não tem RLS de leitura: com o cliente do aluno os valores da escola
  // vinham vazios e o seguro voltava ao valor da rede. Lê com o service role quando existe.
  const reader = getAdminClientOrNull().client ?? supabase;
  const [network, { data: students }] = await Promise.all([
    getInsuranceSettings(supabase),
    reader.from("Student").select("id, schoolId").in("id", studentIds),
  ]);
  const schoolByStudent = new Map(((students ?? []) as { id: string; schoolId: string | null }[]).map((s) => [s.id, s.schoolId]));
  const schoolIds = [...new Set([...schoolByStudent.values()].filter((x): x is string => Boolean(x)))];
  const { data: overrides } = schoolIds.length
    ? await reader.from("SchoolPaymentSettings").select("schoolId, enrollmentAmount, insuranceAnnualAmount").in("schoolId", schoolIds)
    : { data: [] };
  const overrideBySchool = new Map(
    ((overrides ?? []) as (SchoolFeeOverrides & { schoolId: string })[]).map((o) => [o.schoolId, o])
  );

  let updated = 0;
  for (const row of payments) {
    const schoolId = schoolByStudent.get(row.studentId) ?? null;
    const annual = applySchoolFeeOverrides(network, schoolId ? overrideBySchool.get(schoolId) ?? null : null).annualAmount;
    if (annual <= 0) continue;
    const current = Number(row.amount);
    if (Math.abs(current - annual) < 0.009) continue;
    const { error: upErr } = await supabase.from("Payment").update({ amount: annual.toFixed(2) }).eq("id", row.id);
    if (!upErr) updated += 1;
  }

  return { updated };
}
