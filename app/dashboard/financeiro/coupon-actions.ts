"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { applyCouponToPayments, couponEligiblePayments, removeCouponFromPayments } from "@/lib/coupons/service";

export type CouponActionResult = { error?: string; ok?: boolean };

function refresh() {
  revalidatePath("/adesao/pagamento");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/admin/financeiro/cupoes");
}

/** O aluno aplica um código aos pagamentos que tem em aberto (inscrição, seguro, mensalidade). */
export async function applyStudentCoupon(code: string): Promise<CouponActionResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão expirada. Entra outra vez." };
  const admin = getAdminClientOrNull().client;
  if (!admin) return { error: "Não foi possível aplicar o cupão agora." };
  if (!code.trim()) return { error: "Escreve o código." };
  const { data: student } = await admin.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  const payments = await couponEligiblePayments(admin, studentId);
  const r = await applyCouponToPayments(admin, {
    studentId,
    schoolId: (student as { schoolId?: string | null } | null)?.schoolId ?? null,
    raw: code,
    payments,
  });
  if (r.error) return { error: r.error };
  refresh();
  return { ok: true };
}

export async function removeStudentCoupon(couponId: string): Promise<CouponActionResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão expirada. Entra outra vez." };
  const admin = getAdminClientOrNull().client;
  if (!admin) return { error: "Não foi possível remover o cupão agora." };
  const r = await removeCouponFromPayments(admin, { couponId, personKey: studentId });
  refresh();
  return r.error ? { error: r.error } : { ok: true };
}
