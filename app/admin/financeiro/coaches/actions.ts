"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { canAccessSchool, getSchoolScope } from "@/lib/school-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSchoolCoachMonth } from "@/lib/coach-revenue.server";

export type CoachPayoutResult = { error?: string; ok?: boolean };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/** Só o Diretor Técnico da escola do professor ou o Admin Geral (decisão 2026-11-24). */
async function authorize(schoolId: string): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return "Não autorizado.";
  const permErr = await adminPermissionError("admin:financeiro:write");
  if (permErr) return permErr;
  if (!canAccessSchool(await getSchoolScope(), schoolId)) return "Só o Diretor Técnico desta escola ou o Admin Geral podem marcar este pagamento.";
  return null;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function markCoachPayoutPaid(_prev: CoachPayoutResult | null, formData: FormData): Promise<CoachPayoutResult> {
  const coachId = String(formData.get("coachId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!coachId || !schoolId || !MONTH_RE.test(month)) return { error: "Pedido inválido." };
  if (month >= currentMonth()) return { error: "Só se marca o pagamento depois de o mês fechar." };
  const authErr = await authorize(schoolId);
  if (authErr) return { error: authErr };
  const dbUser = (await getCurrentDbUser())!;

  const db = createAdminClient();
  // O valor é sempre recalculado aqui e fica guardado (o relatório do mês não muda depois de pago).
  const summary = (await loadSchoolCoachMonth(db, schoolId, month)).get(coachId);
  if (!summary) return { error: "Este professor não tem modalidades nesta escola." };

  let receiptPath: string | null = null;
  const proof = formData.get("proof");
  if (proof instanceof File && proof.size > 0) {
    if (proof.size > MAX_PROOF_BYTES) return { error: "Comprovativo demasiado grande (máx. 5 MB)." };
    if (!["application/pdf", "image/png", "image/jpeg"].includes(proof.type)) return { error: "Comprovativo: PDF, PNG ou JPG." };
    const ext = proof.type === "application/pdf" ? "pdf" : proof.type === "image/png" ? "png" : "jpg";
    receiptPath = `coach-payouts/${schoolId}/${month}/${coachId}-${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from("payment-proofs").upload(receiptPath, proof, { contentType: proof.type, upsert: false });
    if (upErr) return { error: "Não foi possível guardar o comprovativo." };
  }

  const now = new Date().toISOString();
  const { error } = await db.from("CoachPayout").upsert(
    {
      coachId,
      schoolId,
      referenceMonth: month,
      amount: summary.received,
      studentCount: summary.paidStudentCount,
      breakdown: summary.lines.filter((l) => l.paid),
      status: "PAID",
      paidAt: now,
      paidByUserId: dbUser.id,
      ...(receiptPath ? { receiptPath } : {}),
      notes: String(formData.get("notes") ?? "").trim().slice(0, 300) || null,
      updatedAt: now,
    },
    { onConflict: "coachId,schoolId,referenceMonth" }
  );
  if (error) return { error: "Não foi possível marcar o pagamento." };

  revalidatePath("/admin/financeiro/coaches");
  revalidatePath("/coach/financeiro");
  return { ok: true };
}

export async function undoCoachPayout(_prev: CoachPayoutResult | null, formData: FormData): Promise<CoachPayoutResult> {
  const coachId = String(formData.get("coachId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!coachId || !schoolId || !MONTH_RE.test(month)) return { error: "Pedido inválido." };
  const authErr = await authorize(schoolId);
  if (authErr) return { error: authErr };

  const db = createAdminClient();
  const { error } = await db
    .from("CoachPayout")
    .update({ status: "PENDING", paidAt: null, paidByUserId: null, updatedAt: new Date().toISOString() })
    .eq("coachId", coachId)
    .eq("schoolId", schoolId)
    .eq("referenceMonth", month);
  if (error) return { error: "Não foi possível anular." };

  revalidatePath("/admin/financeiro/coaches");
  revalidatePath("/coach/financeiro");
  return { ok: true };
}
