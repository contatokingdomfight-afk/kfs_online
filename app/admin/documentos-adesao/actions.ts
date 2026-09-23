"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import { invalidateStudentGateCache } from "@/lib/student-gate-cache";

export type MarkPhysicalDocumentsResult = { error?: string; ok?: boolean };

/**
 * Marca os 3 documentos de adesão (Termo de Responsabilidade, Condições Gerais, Comprovativo)
 * como assinados/concluídos com base num contrato físico (papel) já arquivado — sem exigir
 * a assinatura digital. Usa `version: "legacy"`, a mesma convenção que as migrações de contas
 * antigas já usam em `isMembershipAgreementCurrent`/`isEnrollmentFormCurrent`
 * (lib/insurance-settings.ts, lib/enrollment-form.ts) para nunca voltar a pedir re-assinatura
 * quando a versão do contrato mudar no futuro — o papel arquivado não acompanha essa versão.
 */
export async function markAdesaoDocumentsOnPaper(studentId: string): Promise<MarkPhysicalDocumentsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:alunos:write");
  if (permErr) return { error: permErr };

  const supabase = createAdminClient();

  const { data: student } = await supabase.from("Student").select("planId").eq("id", studentId).maybeSingle();
  if (!student) return { error: "Aluno não encontrado." };
  const planId = (student as { planId?: string | null }).planId ?? null;

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("dateOfBirth")
    .eq("studentId", studentId)
    .maybeSingle();
  const todayYmd = new Date().toISOString().slice(0, 10);
  const isMinor = isMinorFromDateOfBirth(
    (profile as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? null,
    todayYmd
  );

  const signedAtIso = new Date().toISOString();
  const signatureName = `Contrato físico (registo manual por ${dbUser.name ?? dbUser.email})`;

  const waiverRow = {
    studentId,
    waiverSigned: true,
    waiverSignedAt: signedAtIso,
    waiverVersion: "legacy",
    signatureName,
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
    agreementVersion: "legacy",
    planId,
    signatureName,
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

  const formRow = {
    studentId,
    formCompleted: true,
    formCompletedAt: signedAtIso,
    formVersion: "legacy",
    planId,
    updatedAt: signedAtIso,
  };
  const { data: existingForm } = await supabase
    .from("StudentEnrollmentForm")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();
  if (existingForm?.id) {
    const { error } = await supabase.from("StudentEnrollmentForm").update(formRow).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("StudentEnrollmentForm").insert({ id: crypto.randomUUID(), ...formRow });
    if (error) return { error: error.message };
  }

  // O próprio pedido ao admin já confirma "assinado e arquivado" (ver texto do ConfirmModal) —
  // não faz sentido pedir para reimprimir/arquivar um papel que já está arquivado.
  await supabase
    .from("Student")
    .update({ physicalDocumentsFiledAt: signedAtIso, physicalDocumentsFiledByUserId: dbUser.id })
    .eq("id", studentId);

  await invalidateStudentGateCache(studentId);

  revalidatePath("/admin/documentos-adesao");
  revalidatePath(`/admin/alunos/${studentId}/contrato`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documentos-adesao");

  return { ok: true };
}

export type MarkPhysicallyFiledResult = { error?: string; ok?: boolean };

/** Admin confirma que já imprimiu e arquivou fisicamente o pacote de documentos deste aluno. */
export async function markDocumentsPhysicallyFiled(studentId: string): Promise<MarkPhysicallyFiledResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:alunos:write");
  if (permErr) return { error: permErr };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Student")
    .update({ physicalDocumentsFiledAt: new Date().toISOString(), physicalDocumentsFiledByUserId: dbUser.id })
    .eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/documentos-adesao");
  revalidatePath(`/admin/alunos/${studentId}/contrato`);

  return { ok: true };
}

/** Desfaz uma marcação por engano — o aluno volta a aparecer na lista "por imprimir/arquivar". */
export async function unmarkDocumentsPhysicallyFiled(studentId: string): Promise<MarkPhysicallyFiledResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:alunos:write");
  if (permErr) return { error: permErr };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Student")
    .update({ physicalDocumentsFiledAt: null, physicalDocumentsFiledByUserId: null })
    .eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/documentos-adesao");
  revalidatePath(`/admin/alunos/${studentId}/contrato`);

  return { ok: true };
}
