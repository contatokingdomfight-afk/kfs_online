import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { getStudentOnboardingFeesState } from "@/lib/student-onboarding-fees";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { resolvePlanMonthlyTuition } from "@/lib/family-tuition";

export const GYM_ENROLLMENT_INFO = {
  name: "EPICENTRO DE HONRA - LDA",
  nipc: "519296850",
  address: "Praceta Laura Alves 8, 2725-206 Algueirão-Mem Martins",
  phone: "+351 923 036 630",
  email: "contatokingdomfight@gmail.com",
} as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "DEBIT_DIRECT", label: "Débito direto" },
  { value: "OTHER", label: "Outro" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHOD_OPTIONS)[number]["value"];

export type EnrollmentFormRow = {
  formCompleted: boolean;
  formCompletedAt: string | null;
  formVersion: string | null;
  planId: string | null;
  idDocument: string | null;
  taxId: string | null;
  addressLine: string | null;
  postalCode: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  paymentMethod: string | null;
  debitIban: string | null;
  allergies: string | null;
  knownHealthCondition: string | null;
  emergencyMedication: string | null;
  consentPhoto: boolean;
  consentVideo: boolean;
  consentSocialMedia: boolean;
  consentMarketing: boolean;
  insuranceAccepted: boolean;
  membershipStartDate: string | null;
};

export type EnrollmentFormPrefill = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  planName: string;
  modalityLabel: string | null;
  monthlyAmount: number;
  enrollmentAmount: number;
  insuranceAmount: number;
  showEnrollment: boolean;
  showInsurance: boolean;
  membershipStartDate: string;
  existing: Partial<EnrollmentFormRow>;
};

export function isEnrollmentFormCurrent(
  row: { formCompleted?: boolean; formVersion?: string | null } | null | undefined,
  currentVersion: string
): boolean {
  if (!row?.formCompleted) return false;
  const version = row.formVersion ?? "";
  if (!version || version === "legacy") return true;
  return version === currentVersion;
}

export async function loadEnrollmentFormPrefill(
  supabase: SupabaseClient,
  studentId: string,
  userId: string
): Promise<EnrollmentFormPrefill | null> {
  const [{ data: user }, { data: student }, { data: profile }, { data: form }] = await Promise.all([
    supabase.from("User").select("name, email").eq("id", userId).maybeSingle(),
    supabase.from("Student").select("planId, primaryModality").eq("id", studentId).maybeSingle(),
    supabase
      .from("StudentProfile")
      .select("dateOfBirth, phone, medicalNotes, emergencyContact")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
  ]);

  const planId = (student as { planId?: string | null } | null)?.planId;
  if (!planId) return null;

  const { data: plan } = await supabase
    .from("Plan")
    .select("name, priceMonthly")
    .eq("id", planId)
    .maybeSingle();

  const fees = await getStudentOnboardingFeesState(supabase, studentId);
  const monthlyAmount = resolvePlanMonthlyTuition(
    planId,
    Number((plan as { priceMonthly?: number } | null)?.priceMonthly ?? 0)
  );

  const primaryModality = (student as { primaryModality?: string | null } | null)?.primaryModality ?? null;
  const modalityLabel = primaryModality ? MODALITY_LABELS[primaryModality] ?? primaryModality : null;

  const dobRaw = (profile as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? "";
  const dateOfBirth = dobRaw ? String(dobRaw).slice(0, 10) : "";

  const existingRow = (form ?? {}) as Partial<EnrollmentFormRow>;
  const today = new Date().toISOString().slice(0, 10);

  return {
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    dateOfBirth,
    phone: (profile as { phone?: string | null } | null)?.phone ?? "",
    planName: (plan as { name?: string } | null)?.name ?? "Plano",
    modalityLabel,
    monthlyAmount,
    enrollmentAmount: fees.enrollmentAmount,
    insuranceAmount: fees.insuranceAmount,
    showEnrollment: fees.showEnrollment,
    showInsurance: fees.showInsurance,
    membershipStartDate: existingRow.membershipStartDate ?? today,
    existing: {
      ...existingRow,
      knownHealthCondition:
        existingRow.knownHealthCondition ??
        (profile as { medicalNotes?: string | null } | null)?.medicalNotes ??
        "",
      emergencyContactPhone:
        existingRow.emergencyContactPhone ??
        (profile as { emergencyContact?: string | null } | null)?.emergencyContact ??
        "",
    },
  };
}

export async function getEnrollmentFormSettings(supabase: SupabaseClient) {
  const settings = await getInsuranceSettings(supabase);
  return {
    enrollmentFormVersion: (settings as { enrollmentFormVersion?: string }).enrollmentFormVersion ?? "1",
    membershipAgreementVersion: settings.membershipAgreementVersion,
  };
}

export const GDPR_CONSENT_INTRO = `Nos termos do Regulamento (UE) 2016/679 (RGPD) e da Lei n.º 58/2019, a Kingdom Fight School informa o(a) Sócio(a) de que os dados pessoais recolhidos serão tratados para gestão da inscrição, controlo de acessos, aplicação móvel, marcação de aulas, faturação, seguros, eventos, comunicações e cumprimento de obrigações legais.`;

export const FINAL_DECLARATIONS = [
  "Declaro que recebi, li e compreendi as Condições Gerais de Adesão e o Regulamento Interno da Academia, aceitando integralmente o seu conteúdo.",
  "Declaro que, tanto quanto é do meu conhecimento, não possuo limitações físicas incompatíveis com a prática da modalidade escolhida, ou que comuniquei previamente à Academia as limitações relevantes.",
  "Declaro ter sido informado de que a Aplicação da Kingdom Fight School poderá tratar dados necessários à execução do contrato, nos termos da Política de Privacidade.",
  "Fui informado das condições relativas ao seguro aplicável à minha inscrição.",
];
