"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import { isEnrollmentFormCurrent } from "@/lib/enrollment-form";

export type SignMembershipAgreementResult = { error?: string };

export async function signMembershipAgreement(
  _prev: SignMembershipAgreementResult | null,
  formData: FormData
): Promise<SignMembershipAgreementResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const signatureName = (formData.get("signatureName") as string)?.trim();
  const guardianName = (formData.get("guardianName") as string)?.trim() || null;
  const accepted = formData.get("accepted") === "on" || formData.get("accepted") === "true";

  if (!accepted) return { error: "Deves aceitar as condições para continuar." };
  if (!signatureName || signatureName.length < 3) {
    return { error: "Indica o teu nome completo como assinatura." };
  }

  const supabase = await createClient();
  const settings = await getInsuranceSettings(supabase);

  const { data: student } = await supabase
    .from("Student")
    .select("planId")
    .eq("id", studentId)
    .maybeSingle();

  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  if (!planId) return { error: "Escolhe um plano antes de assinar o contrato de adesão." };

  const { data: enrollmentForm } = await supabase
    .from("StudentEnrollmentForm")
    .select("formCompleted, formVersion")
    .eq("studentId", studentId)
    .maybeSingle();

  if (!isEnrollmentFormCurrent(enrollmentForm, settings.enrollmentFormVersion)) {
    return { error: "Preenche o comprovativo de adesão antes de assinar o contrato." };
  }

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("dateOfBirth")
    .eq("studentId", studentId)
    .maybeSingle();

  const todayYmd = new Date().toISOString().slice(0, 10);
  const dob = (profile as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? null;
  const isMinor = isMinorFromDateOfBirth(dob, todayYmd);
  if (isMinor && (!guardianName || guardianName.length < 3)) {
    return { error: "Indica o nome completo do responsável legal." };
  }

  const h = await headers();
  const signatureIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";

  const row = {
    studentId,
    agreementSigned: true,
    agreementSignedAt: new Date().toISOString(),
    agreementVersion: settings.membershipAgreementVersion,
    planId,
    signatureName,
    signatureIp,
    guardianName: isMinor ? guardianName : null,
    isMinor,
    updatedAt: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("StudentMembershipAgreement")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("StudentMembershipAgreement").update(row).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("StudentMembershipAgreement")
      .insert({ id: crypto.randomUUID(), ...row });
    if (error) return { error: error.message };
  }

  revalidatePath("/adesao");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documentos-adesao");
  revalidatePath("/dashboard/financeiro");
  redirect("/dashboard/financeiro?pagamento_escola=1");
}
