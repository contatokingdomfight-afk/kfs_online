// Sem "server-only": entra por import em cadeia no bundle de components/home/Testimonials.tsx
// (school-contact → enrollment-form → student-onboarding-fees). Só corre no servidor; no browser
// a chave de serviço não existe e getAdminClientOrNull devolve null.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import {
  applySchoolFeeOverrides,
  getInsuranceSettings,
  type InsuranceSettingsRow,
  type SchoolFeeOverrides,
} from "@/lib/insurance-settings";

/**
 * Valores da rede com as taxas próprias da escola por cima (SchoolPaymentSettings.enrollmentAmount /
 * insuranceAnnualAmount; NULL = valor da rede). As versões dos documentos continuam as da rede.
 * SchoolPaymentSettings não tem políticas RLS (só o servidor lê): usa o service role quando existe.
 */
export async function getFeeSettingsForSchool(
  supabase: SupabaseClient,
  schoolId: string | null | undefined
): Promise<InsuranceSettingsRow> {
  const reader = getAdminClientOrNull().client ?? supabase;
  const [settings, { data: school }] = await Promise.all([
    getInsuranceSettings(supabase),
    schoolId
      ? reader.from("SchoolPaymentSettings").select("enrollmentAmount, insuranceAnnualAmount").eq("schoolId", schoolId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return applySchoolFeeOverrides(settings, school as SchoolFeeOverrides | null);
}

/** Igual a getFeeSettingsForSchool, a partir do aluno (taxas da escola dele). */
export async function getFeeSettingsForStudent(supabase: SupabaseClient, studentId: string): Promise<InsuranceSettingsRow> {
  const reader = getAdminClientOrNull().client ?? supabase;
  const { data } = await reader.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  return getFeeSettingsForSchool(supabase, (data as { schoolId?: string | null } | null)?.schoolId ?? null);
}
