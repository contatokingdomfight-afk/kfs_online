import "server-only";

import { cache } from "react";
import { GYM_ENROLLMENT_INFO } from "@/lib/enrollment-form";
import { schoolsWithMerchantAccount } from "@/lib/revolut/merchant-accounts";
import { SEDE_DISPLAY_NAME } from "@/lib/school-name-text";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import {
  NO_SCHOOL_PAYMENT_INFO,
  SEDE_SCHOOL_ID,
  schoolPaymentInfoFromRow,
  type EnrollmentSchoolDetails,
  type SchoolIdentity,
  type SchoolPaymentInfo,
  type SchoolPaymentSettingsRow,
} from "@/lib/school-payment-rules";

export * from "@/lib/school-payment-rules";

// A tabela só é legível pelo servidor (RLS sem políticas), por isso usa sempre o cliente admin.
const SETTINGS_COLUMNS = "schoolId, ibanEnabled, iban, ibanHolder, ibanHolderAddress, bicSwift, revolutTag, mbwayEnabled, mbwayPhone, cashEnabled, revolutEnabled";

/** Meios de várias escolas de uma vez. Escola sem linha (ou erro de leitura) = sem meios. */
export async function loadSchoolsPaymentInfo(schoolIds: string[]): Promise<Map<string, SchoolPaymentInfo>> {
  const out = new Map<string, SchoolPaymentInfo>();
  const ids = [...new Set(schoolIds)];
  const admin = getAdminClientOrNull().client;
  if (!admin || !ids.length) return out;
  const [{ data, error }, withAccount] = await Promise.all([admin.from("SchoolPaymentSettings").select(SETTINGS_COLUMNS).in("schoolId", ids), schoolsWithMerchantAccount(admin, ids)]);
  if (error) {
    console.error("[school-payment-methods]", error.message);
    return out;
  }
  for (const row of (data ?? []) as unknown as (SchoolPaymentSettingsRow & { schoolId: string })[]) {
    out.set(row.schoolId, schoolPaymentInfoFromRow(row.schoolId, row, withAccount.has(row.schoolId)));
  }
  return out;
}

/** Meios de uma escola (cache por pedido). */
export const loadSchoolPaymentInfo = cache(async function loadSchoolPaymentInfo(schoolId: string | null | undefined): Promise<SchoolPaymentInfo> {
  if (!schoolId) return NO_SCHOOL_PAYMENT_INFO;
  return (await loadSchoolsPaymentInfo([schoolId])).get(schoolId) ?? NO_SCHOOL_PAYMENT_INFO;
});

export const loadStudentSchoolId = cache(async function loadStudentSchoolId(studentId: string): Promise<string | null> {
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  const { data } = await admin.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  return (data as { schoolId?: string | null } | null)?.schoolId ?? null;
});

/** Meios da escola do aluno. */
export async function loadStudentPaymentInfo(studentId: string | null | undefined): Promise<SchoolPaymentInfo> {
  if (!studentId) return NO_SCHOOL_PAYMENT_INFO;
  return loadSchoolPaymentInfo(await loadStudentSchoolId(studentId));
}

const SEDE_IDENTITY: SchoolIdentity = {
  name: GYM_ENROLLMENT_INFO.name,
  displayName: SEDE_DISPLAY_NAME,
  tradeName: GYM_ENROLLMENT_INFO.tradeName,
  nipc: GYM_ENROLLMENT_INFO.nipc,
  address: GYM_ENROLLMENT_INFO.address,
  phone: GYM_ENROLLMENT_INFO.phone,
  email: GYM_ENROLLMENT_INFO.email,
};

/** Identificação da escola do aluno. Null = não foi possível ler (o ecrã omite o bloco, nunca mostra a Sede em vez dela). */
export async function loadStudentSchoolIdentity(studentId: string | null | undefined): Promise<SchoolIdentity | null> {
  if (!studentId) return null;
  const schoolId = await loadStudentSchoolId(studentId);
  if (!schoolId) return null;
  if (schoolId === SEDE_SCHOOL_ID) return SEDE_IDENTITY;
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  const [{ data: school }, { data: settings }] = await Promise.all([
    admin.from("School").select("name, legalName, legalAddress, address, phone, email").eq("id", schoolId).maybeSingle(),
    admin.from("SchoolPaymentSettings").select("nif").eq("schoolId", schoolId).maybeSingle(),
  ]);
  if (!school) return null;
  const s = school as { name: string; legalName: string | null; legalAddress: string | null; address: string | null; phone: string | null; email: string | null };
  return {
    name: s.legalName?.trim() || s.name,
    displayName: s.name,
    tradeName: null,
    nipc: (settings as { nif?: string | null } | null)?.nif ?? null,
    address: s.legalAddress?.trim() || s.address,
    phone: s.phone,
    email: s.email,
  };
}

export async function loadEnrollmentSchoolDetails(studentId: string | null | undefined): Promise<EnrollmentSchoolDetails> {
  const [identity, payment] = await Promise.all([loadStudentSchoolIdentity(studentId), loadStudentPaymentInfo(studentId)]);
  return { identity, payment };
}
