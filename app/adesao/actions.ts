"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import { isEnrollmentFormCurrent } from "@/lib/enrollment-form";
import { invalidateStudentGateCache } from "@/lib/student-gate-cache";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { revolutMerchantConfigured } from "@/lib/revolut/merchant";
import { resolveAutoPayPayer } from "@/lib/autopay/service";
import { createTuitionCheckout } from "@/lib/tuition-checkout/service";

export type SignAdesaoDocumentsResult = { error?: string; planId?: string | null };

/**
 * Núcleo da assinatura (Termo de Responsabilidade + Condições Gerais), independente de
 * quem submete — o próprio aluno em `/adesao`, ou o admin em
 * `/admin/alunos/[id]/contrato/assinar` (ex.: sócios Kids sem acesso próprio à plataforma,
 * com o encarregado de educação presente). `supabase` já vem com o cliente certo para o
 * chamador (sessão do aluno vs. admin service-role).
 */
export async function applyAdesaoSigning(
  supabase: SupabaseClient,
  studentId: string,
  formData: FormData
): Promise<SignAdesaoDocumentsResult> {
  const signatureName = (formData.get("signatureName") as string)?.trim();
  const guardianName = (formData.get("guardianName") as string)?.trim() || null;
  const accepted = formData.get("accepted") === "on" || formData.get("accepted") === "true";
  const signatureImageUrl = (formData.get("signatureImageUrl") as string)?.trim() || null;

  if (!accepted) return { error: "Deves aceitar as condições para continuar." };
  if (!signatureName || signatureName.length < 3) {
    return { error: "Indica o nome completo como assinatura." };
  }
  if (!signatureImageUrl) {
    return { error: "Assina no espaço indicado (desenha com o dedo ou o rato) antes de continuar." };
  }

  const settings = await getInsuranceSettings(supabase);

  const { data: student } = await supabase
    .from("Student")
    .select("planId")
    .eq("id", studentId)
    .maybeSingle();

  const planId = (student as { planId?: string | null } | null)?.planId ?? null;

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

  const signedAtIso = new Date().toISOString();

  const waiverRow = {
    studentId,
    waiverSigned: true,
    waiverSignedAt: signedAtIso,
    waiverVersion: settings.waiverVersion,
    signatureName,
    signatureImageUrl,
    signatureIp,
    guardianName: isMinor ? guardianName : null,
    isMinor,
    updatedAt: signedAtIso,
  };

  const { data: existingWaiver } = await supabase
    .from("StudentWaiver")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existingWaiver?.id) {
    const { error } = await supabase.from("StudentWaiver").update(waiverRow).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("StudentWaiver").insert({ id: crypto.randomUUID(), ...waiverRow });
    if (error) return { error: error.message };
  }

  const agreementRow = {
    studentId,
    agreementSigned: true,
    agreementSignedAt: signedAtIso,
    agreementVersion: settings.membershipAgreementVersion,
    planId,
    signatureName,
    signatureImageUrl,
    signatureIp,
    guardianName: isMinor ? guardianName : null,
    isMinor,
    updatedAt: signedAtIso,
  };

  const { data: existingAgreement } = await supabase
    .from("StudentMembershipAgreement")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existingAgreement?.id) {
    const { error } = await supabase.from("StudentMembershipAgreement").update(agreementRow).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("StudentMembershipAgreement")
      .insert({ id: crypto.randomUUID(), ...agreementRow });
    if (error) return { error: error.message };
  }

  // O gate de middleware cacheia "documentsSigned" por 10s (lib/edge-ttl-cache.ts) — sem isto, um
  // aluno que navegue logo a seguir a assinar podia ainda ser tratado como "por assinar" e ficar
  // preso a saltar entre /adesao e /dashboard/documentos-adesao até a cache expirar.
  await invalidateStudentGateCache(studentId);

  return { planId };
}

export async function signAdesaoDocuments(
  _prev: SignAdesaoDocumentsResult | null,
  formData: FormData
): Promise<SignAdesaoDocumentsResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
  const result = await applyAdesaoSigning(supabase, studentId, formData);
  if (result.error) return result;

  revalidatePath("/adesao");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  revalidatePath("/dashboard/documentos-adesao");
  revalidatePath("/dashboard/financeiro");
  // Escolheu pagar online: vai já à página da Revolut pagar inscrição + seguro + 1.ª mensalidade.
  // Se falhar (ou fechar sem pagar), a adesão fica guardada e paga depois em Plano e pagamentos.
  // Com ou sem plano: se houver algo a pagar da adesão (ex.: inscrição da aula avulsa), segue para a Revolut.
  const checkoutUrl = await adesaoRevolutCheckoutUrl(studentId);
  if (checkoutUrl) redirect(checkoutUrl);
  // Sem plano (aula avulsa): paga por sessão, não por mensalidade — não faz sentido
  // mandar para o gate de pagamento de mensalidade.
  redirect(result.planId ? "/dashboard/financeiro?pagamento_escola=1" : "/dashboard");
}

/** Link Revolut para os pagamentos da adesão, quando o aluno escolheu «Pagamento online». Null = segue o fluxo normal. */
async function adesaoRevolutCheckoutUrl(studentId: string): Promise<string | null> {
  if (!revolutMerchantConfigured) return null;
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  try {
    const { data: form } = await admin.from("StudentEnrollmentForm").select("paymentMethod").eq("studentId", studentId).maybeSingle();
    if ((form as { paymentMethod?: string | null } | null)?.paymentMethod !== "REVOLUT") return null;
    const payer = await resolveAutoPayPayer(admin, studentId);
    const dbUser = await getCurrentDbUser();
    const h = await headers();
    const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "www.kingdomfight.com"}`;
    const res = await createTuitionCheckout(admin, {
      payerStudentId: payer.isFamilyMember ? studentId : payer.payerStudentId,
      createdByUserId: dbUser?.id ?? null,
      email: dbUser?.email ?? null,
      returnUrl: `${origin}/dashboard/financeiro?pago=1&adesao=1`,
      description: "Adesão · Kingdom Fight School",
    });
    return res.url ?? null;
  } catch (e) {
    console.error("[adesao revolut]", e);
    return null;
  }
}
