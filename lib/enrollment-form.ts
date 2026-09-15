import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { getStudentOnboardingFeesState } from "@/lib/student-onboarding-fees";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { resolvePlanMonthlyTuition } from "@/lib/family-tuition";

export const GYM_ENROLLMENT_INFO = {
  name: "EPICENTRO DE HONRA - LDA",
  tradeName: "Também chamada Kingdom Fight School",
  nipc: "519296850",
  address: "Praceta Laura Alves 8, 2725-206 Algueirão-Mem Martins",
  phone: "+351936832300",
  email: "contatokingdomfight@gmail.com",
} as const;

/** IBAN da empresa para transferências bancárias. */
export const SCHOOL_TRANSFER_IBAN = "LT383250045228499203";

/** Dados adicionais de pagamento — transferência/Revolut, mostrados junto ao IBAN. */
export const SCHOOL_PAYMENT_DETAILS = {
  recipientName: "Epicentro de Honra",
  recipientAddress: "Rua Viana da Mota, 18, 2765-562 São Pedro do Estoril, Portugal",
  iban: SCHOOL_TRANSFER_IBAN,
  bicSwift: "REVOLT21",
  revolutTag: "@kingdom_01",
  /** Dia útil limite para pagamento da mensalidade de cada mês. */
  monthlyDueDayNote: "até ao terceiro dia útil de cada mês",
} as const;

export const MAX_PAYMENT_PROOF_BYTES = 8 * 1024 * 1024;
export const ALLOWED_PAYMENT_PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Dinheiro em espécie" },
  { value: "TRANSFER", label: "Transferência bancária" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHOD_OPTIONS)[number]["value"];

const LEGACY_ENROLLMENT_PAYMENT_LABELS: Record<string, string> = {
  DEBIT_DIRECT: "Débito direto (legado)",
  OTHER: "Outro (legado)",
};

export function enrollmentPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  const current = PAYMENT_METHOD_OPTIONS.find((o) => o.value === method);
  if (current) return current.label;
  return LEGACY_ENROLLMENT_PAYMENT_LABELS[method] ?? method;
}

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
  paymentProofPath: string | null;
  paymentProofFileName: string | null;
  paymentProofUploadedAt: string | null;
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
  primaryModality: string | null;
  modalityScope: string | null;
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
    .select("name, priceMonthly, modalityScope")
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
    primaryModality,
    modalityScope: (plan as { modalityScope?: string | null } | null)?.modalityScope ?? null,
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

export const GDPR_CONSENT_INTRO = `Nos termos do Regulamento (UE) 2016/679 (Regulamento Geral sobre a Proteção de Dados – RGPD) e da Lei n.º 58/2019, a Kingdom Fight School informa o(a) Sócio(a) de que os dados pessoais recolhidos serão tratados para as seguintes finalidades:`;

export const ENROLLMENT_GDPR_PURPOSES = [
  "gestão da inscrição e execução do contrato de prestação de serviços;",
  "controlo de acessos às instalações;",
  "gestão da aplicação móvel da Academia;",
  "marcação e gestão de aulas;",
  "gestão administrativa, contabilística e faturação;",
  "gestão de seguros desportivos, quando aplicável;",
  "organização de seminários, estágios, competições e outros eventos promovidos pela Kingdom Fight School;",
  "comunicação de informações relacionadas com os serviços contratados;",
  "cumprimento de obrigações legais.",
] as const;

export const ENROLLMENT_GDPR_RETENTION =
  "Os dados pessoais serão conservados apenas pelo período necessário ao cumprimento das finalidades acima identificadas ou durante os prazos legalmente exigidos.";

export const ENROLLMENT_GDPR_RIGHTS =
  "O(A) Sócio(a) poderá exercer, nos termos da lei, os direitos de acesso, retificação, apagamento, limitação do tratamento, oposição e portabilidade dos dados pessoais, mediante comunicação escrita dirigida à Kingdom Fight School.";

/** Modalidades do comprovativo oficial (secção 5). */
export const ENROLLMENT_MODALITY_CHECKBOXES = [
  { code: "BJJ", label: "Jiu-Jitsu Brasileiro" },
  { code: "MUAY_THAI", label: "Muay Thai" },
  { code: "BOXING", label: "Boxe" },
  { code: "ALL", label: "Todas acima" },
] as const;

export const ENROLLMENT_CONSENT_SECTIONS = [
  {
    key: "consentPhoto" as const,
    title: "Captação de fotografia",
    yes: "Autorizo a captação e utilização de fotografias em que eu seja identificável para divulgação institucional da Academia.",
    no: "Não autorizo.",
  },
  {
    key: "consentVideo" as const,
    title: "Captação de vídeo",
    yes: "Autorizo a captação e utilização de vídeos em que eu seja identificável para divulgação institucional da Academia.",
    no: "Não autorizo.",
  },
  {
    key: "consentSocialMedia" as const,
    title: "Redes Sociais e Materiais Promocionais",
    yes: "Autorizo a publicação da minha imagem nas redes sociais oficiais, no website oficial e em cartazes, brochuras, folhetos e outros materiais promocionais da Kingdom Fight School.",
    no: "Não autorizo.",
  },
  {
    key: "consentMarketing" as const,
    title: "Comunicações Comerciais",
    yes: "Autorizo o envio de informações relativas a campanhas, eventos, promoções e outras comunicações comerciais da Academia por correio eletrónico, SMS ou outros meios eletrónicos.",
    no: "Não autorizo.",
  },
] as const;

export const ENROLLMENT_CONSENT_FOOTNOTE =
  "Declaro que as autorizações acima concedidas são livres e facultativas, podendo ser retiradas a qualquer momento relativamente a utilizações futuras, sem prejuízo da licitude do tratamento efetuado até essa data.";

export function enrollmentModalityChecked(
  code: (typeof ENROLLMENT_MODALITY_CHECKBOXES)[number]["code"],
  primaryModality: string | null,
  modalityScope: string | null
): boolean {
  const planAll =
    primaryModality === "ALL" ||
    modalityScope === "ALL" ||
    modalityScope === "MULTI";

  if (code === "ALL") return planAll;
  if (planAll) return false;

  if (code === "BOXING" && (primaryModality === "BOXING" || primaryModality === "KICKBOXING")) return true;
  return primaryModality === code;
}

export const FINAL_DECLARATIONS = [
  "Declaro que recebi, li e compreendi as Condições Gerais de Adesão e o Regulamento Interno da Academia, que me foram disponibilizados antes da celebração do contrato, aceitando integralmente o seu conteúdo.",
  "Declaro que, tanto quanto é do meu conhecimento, não possuo limitações físicas incompatíveis com a prática da modalidade escolhida, ou que comuniquei previamente à Academia as limitações relevantes para a prática em segurança.",
  "Declaro ter sido informado de que a Aplicação da Kingdom Fight School poderá tratar dados relativos às presenças, marcações de aulas, modalidade praticada, graduações, histórico de treinos, pagamentos, comunicações e outras informações estritamente necessárias à execução do contrato e à gestão da atividade da Academia, nos termos da Política de Privacidade da Academia.",
  "Fui informado das condições relativas ao seguro aplicável à minha inscrição.",
];
