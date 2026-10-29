"use server";

import { schoolAccessErrorForStudent } from "@/lib/school-scope";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAutoPayPayer } from "@/lib/autopay/service";
import { endLoyalty, loadActiveLoyalty, startLoyalty } from "@/lib/loyalty/service";
import { refreshFamilyTitularPendingTuition } from "@/lib/family-tuition";
import { createTuitionCheckout } from "@/lib/tuition-checkout/service";

async function requireFinanceAdmin() {
  const u = await getCurrentDbUser();
  if (!u || u.role !== "ADMIN") return null;
  if (await adminPermissionError("admin:financeiro:write")) return null;
  return u;
}

function refresh(studentId: string) {
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/financeiro", "layout");
}

/** Admin fideliza o aluno (6 meses a partir do próximo mês). */
export async function adminStartLoyaltyAction(formData: FormData): Promise<void> {
  const u = await requireFinanceAdmin();
  if (!u) return;
  const studentId = String(formData.get("studentId") ?? "");
  if (await schoolAccessErrorForStudent(studentId)) return;
  const supabase = createAdminClient();
  const payer = await resolveAutoPayPayer(supabase, studentId);
  const res = await startLoyalty(supabase, { payerStudentId: payer.payerStudentId, familyGroupId: payer.familyGroupId, createdByUserId: u.id });
  if (res.error) console.error("[loyalty admin] start", res.error);
  if (payer.familyGroupId) await refreshFamilyTitularPendingTuition(supabase, payer.familyGroupId).catch(() => undefined);
  refresh(studentId);
}

/** Admin termina a fidelização; com «cobrar», cria a cobrança de saída (desconto já recebido). */
export async function adminEndLoyaltyAction(formData: FormData): Promise<void> {
  const u = await requireFinanceAdmin();
  if (!u) return;
  const studentId = String(formData.get("studentId") ?? "");
  if (await schoolAccessErrorForStudent(studentId)) return;
  const chargePenalty = formData.get("charge") === "1";
  const supabase = createAdminClient();
  const payer = await resolveAutoPayPayer(supabase, studentId);
  const c = await loadActiveLoyalty(supabase, payer.payerStudentId);
  if (!c) return;
  const res = await endLoyalty(supabase, c, { familyGroupId: payer.familyGroupId, chargePenalty });
  if (res.error) console.error("[loyalty admin] end", res.error);
  if (payer.familyGroupId) await refreshFamilyTitularPendingTuition(supabase, payer.familyGroupId).catch(() => undefined);
  refresh(studentId);
}

/** Admin gera o link Revolut para as mensalidades em atraso do aluno (para enviar por WhatsApp). */
export async function adminCreatePaymentLinkAction(formData: FormData): Promise<void> {
  const u = await requireFinanceAdmin();
  if (!u) return;
  const studentId = String(formData.get("studentId") ?? "");
  if (await schoolAccessErrorForStudent(studentId)) return;
  const supabase = createAdminClient();
  const payer = await resolveAutoPayPayer(supabase, studentId);
  const payingId = payer.isFamilyMember ? studentId : payer.payerStudentId;
  const { data: st } = await supabase.from("Student").select("userId").eq("id", payingId).maybeSingle();
  const userId = (st as { userId?: string } | null)?.userId;
  const { data: user } = userId ? await supabase.from("User").select("email").eq("id", userId).maybeSingle() : { data: null };
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "www.kingdomfight.com"}`;
  try {
    const res = await createTuitionCheckout(supabase, {
      payerStudentId: payingId,
      createdByUserId: u.id,
      email: (user as { email?: string | null } | null)?.email ?? null,
      returnUrl: `${origin}/dashboard/financeiro?pago=1`,
      description: "Pagamentos · Kingdom Fight School",
    });
    if (res.error) console.error("[payment link admin]", res.error);
  } catch (e) {
    console.error("[payment link admin]", e);
  }
  refresh(studentId);
}
