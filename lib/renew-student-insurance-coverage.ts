import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings } from "@/lib/insurance-settings";

function addYearsYmd(ymd: string, years: number): string {
  const y = parseInt(ymd.slice(0, 4), 10) + years;
  return `${y}${ymd.slice(4)}`;
}

/** Renova ou cria cobertura anual de seguro para o aluno. */
export async function renewStudentInsuranceCoverage(
  supabase: SupabaseClient,
  studentId: string,
  renewedByUserId: string
): Promise<{ error?: string }> {
  const settings = await getInsuranceSettings(supabase);
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("StudentInsuranceCoverage")
    .select("coverageEndDate")
    .eq("studentId", studentId)
    .maybeSingle();

  let startDate = today;
  const prevEnd = (existing as { coverageEndDate?: string | null } | null)?.coverageEndDate;
  if (prevEnd && prevEnd >= today) {
    const d = new Date(`${prevEnd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    startDate = d.toISOString().slice(0, 10);
  }

  const endDate = addYearsYmd(startDate, 1);
  const row = {
    studentId,
    covered: true,
    coverageStartDate: startDate,
    coverageEndDate: endDate,
    policyReference: settings.policyReference,
    lastRenewedAt: new Date().toISOString(),
    lastRenewedByUserId: renewedByUserId,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("StudentInsuranceCoverage").update(row).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("StudentInsuranceCoverage")
      .insert({ id: crypto.randomUUID(), ...row });
    if (error) return { error: error.message };
  }

  return {};
}
