"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getFamilyContext } from "@/lib/family-context";
import { resolveAutoPayPayer } from "@/lib/autopay/service";
import { createTuitionCheckout, listLatePayments } from "@/lib/tuition-checkout/service";
import { getPublicOrigin } from "@/lib/site-public-url";
import { invalidateStudentGateCache } from "@/lib/student-gate-cache";
import { uploadPaymentProof, validateEnrollmentPaymentMethod } from "../enrollment-actions";

export type SaveAdesaoPaymentResult = { error?: string };

/**
 * Último passo da adesão (já com tudo assinado): forma de pagamento + comprovativo e, se for o
 * caso, o pedido de grupo familiar (a mensalidade fica para o titular; inscrição e seguro são do aluno).
 */
export async function saveAdesaoPayment(
  _prev: SaveAdesaoPaymentResult | null,
  formData: FormData
): Promise<SaveAdesaoPaymentResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };
  const admin = getAdminClientOrNull().client;
  if (!admin) return { error: "Não foi possível guardar. Tenta novamente ou fala com a tua escola." };

  const familyCtx = await getFamilyContext(admin, studentId);
  const familyRequested = !familyCtx && (formData.get("familyGroupRequested") === "on");

  const late = await listLatePayments(admin, studentId, { keepFamilyPending: true });
  // Membro (ou pedido de família): a mensalidade não é paga por ele.
  const payable = familyRequested || familyCtx?.role === "MEMBER" ? late.filter((p) => p.paymentType !== "TUITION") : late;

  const paymentMethod = ((formData.get("paymentMethod") as string) ?? "").trim();
  if (payable.length > 0) {
    const methodErr = await validateEnrollmentPaymentMethod(studentId, paymentMethod);
    if (methodErr) return { error: methodErr };
  }

  const { data: existing } = await admin
    .from("StudentEnrollmentForm")
    .select("id, paymentMethod, paymentProofPath, paymentProofFileName, paymentProofUploadedAt")
    .eq("studentId", studentId)
    .maybeSingle();
  if (!existing) return { error: "Conclui primeiro a ficha de adesão." };

  const proof = await uploadPaymentProof(studentId, formData, existing);
  if ("error" in proof) return { error: proof.error };

  const now = new Date().toISOString();
  const { error } = await admin
    .from("StudentEnrollmentForm")
    // Nunca fica vazio: é o que diz ao middleware que este passo foi concluído
    // (sem nada a pagar já — só a mensalidade, paga pelo titular — fica «FAMILY»; tudo coberto por cupão, «COUPON»).
    .update({
      paymentMethod:
        paymentMethod || (existing as { paymentMethod?: string | null }).paymentMethod || (familyRequested || familyCtx ? "FAMILY" : "COUPON"),
      ...proof,
      updatedAt: now,
    })
    .eq("studentId", studentId);
  if (error) return { error: error.message };

  // Coluna nova (migração 20261106120000): ignora o erro se ainda não existir.
  if (!familyCtx) {
    const { error: famErr } = await admin
      .from("StudentEnrollmentForm")
      .update({ familyGroupRequested: familyRequested, familyGroupRequestedAt: familyRequested ? now : null })
      .eq("studentId", studentId);
    if (famErr) console.warn("[adesao pagamento] familyGroupRequested:", famErr.message);
  }

  await invalidateStudentGateCache(studentId);
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/admin/familias");

  if (paymentMethod === "REVOLUT" && payable.length > 0) {
    let checkoutUrl: string | null = null;
    try {
      const payer = await resolveAutoPayPayer(admin, studentId);
      const dbUser = await getCurrentDbUser();
      const res = await createTuitionCheckout(admin, {
        payerStudentId: payer.isFamilyMember ? studentId : payer.payerStudentId,
        paymentIds: payable.map((p) => p.id),
        createdByUserId: dbUser?.id ?? null,
        email: dbUser?.email ?? null,
        returnUrl: `${getPublicOrigin()}/dashboard/financeiro?pago=1&adesao=1`,
        description: "Adesão",
      });
      if (res.error) return { error: res.error };
      checkoutUrl = res.url ?? null;
    } catch (e) {
      console.error("[adesao pagamento revolut]", e);
      return { error: "Não foi possível abrir o pagamento online. Escolhe outra forma ou tenta mais tarde." };
    }
    if (checkoutUrl) redirect(checkoutUrl);
  }

  redirect("/dashboard/financeiro?pagamento_escola=1");
}
