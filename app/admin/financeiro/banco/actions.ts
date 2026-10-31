"use server";

import { getSchoolScope, resolveSchoolParam } from "@/lib/school-scope";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPorReceberItems } from "@/lib/finance/por-receber";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { applyReceivedItem, syncRevolutTransactions } from "@/lib/revolut/reconcile";
import { itemLabel, normalizePayer } from "@/lib/revolut/match";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";

/** Quem pode gerir as transferências e de que escola: o pedido do formulário limitado ao acesso do utilizador. */
async function requireFinanceAdmin(formData: FormData) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "ADMIN") return null;
  if (await adminPermissionError("admin:financeiro:write")) return null;
  const scope = await getSchoolScope();
  if (scope.kind === "none") return null;
  // O Admin Geral em «Todas» vê a Sede: as transferências são sempre da conta de uma escola.
  return { user, schoolId: resolveSchoolParam(scope, String(formData.get("schoolId") ?? "")) ?? SEDE_SCHOOL_ID };
}

function refresh() {
  revalidatePath("/admin/financeiro", "layout");
  revalidatePath("/admin");
  revalidatePath("/dashboard/financeiro");
}

export async function syncRevolutNow(formData: FormData): Promise<void> {
  const access = await requireFinanceAdmin(formData);
  if (!access) return;
  await syncRevolutTransactions(createAdminClient(), access.schoolId);
  refresh();
}

/** Confirma a correspondência escolhida pelo admin: marca como pago e aprende quem paga por quem. */
export async function confirmBankMatch(formData: FormData): Promise<void> {
  const access = await requireFinanceAdmin(formData);
  if (!access) return;
  const { user, schoolId } = access;
  const txId = String(formData.get("txId") ?? "");
  const itemKey = String(formData.get("itemKey") ?? "");
  if (!txId || !itemKey) return;
  const supabase = createAdminClient();
  const { data: tx } = await supabase.from("BankTransaction").select("id, matchStatus, payerName").eq("schoolId", schoolId).eq("id", txId).maybeSingle();
  const row = tx as { id: string; matchStatus: string; payerName: string | null } | null;
  if (!row || row.matchStatus === "AUTO" || row.matchStatus === "CONFIRMED") return;

  const items = await loadPorReceberItems(supabase, currentReferenceMonthLisbon(new Date()), [schoolId]);
  const it = items.find((i) => i.key === itemKey);
  if (!it) return;
  const r = await applyReceivedItem(supabase, it, user.id);
  if (r.error) {
    console.error("[confirmBankMatch]", r.error);
    return;
  }
  const now = new Date().toISOString();
  await supabase
    .from("BankTransaction")
    .update({
      matchStatus: "CONFIRMED",
      matchedKind: it.kind,
      matchedStudentId: it.studentId || null,
      matchedPaymentId: it.paymentId,
      matchedOrderId: it.orderId,
      matchedReferenceMonth: it.referenceMonth,
      matchLabel: itemLabel(it),
      appliedAt: now,
      appliedByUserId: user.id,
    })
    .eq("schoolId", schoolId)
    .eq("id", txId);
  const payerKey = normalizePayer(row.payerName);
  if (payerKey && it.studentId) {
    await supabase.from("BankPayerAlias").upsert({ schoolId, payerKey, studentId: it.studentId }, { onConflict: "schoolId,payerKey" });
  }
  refresh();
}

export async function ignoreBankTransaction(formData: FormData): Promise<void> {
  const access = await requireFinanceAdmin(formData);
  if (!access) return;
  const txId = String(formData.get("txId") ?? "");
  if (!txId) return;
  await createAdminClient().from("BankTransaction").update({ matchStatus: "IGNORED" }).eq("schoolId", access.schoolId).eq("id", txId).in("matchStatus", ["SUGGESTED", "UNMATCHED"]);
  refresh();
}
