"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPorReceberItems } from "@/lib/finance/por-receber";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { applyReceivedItem, syncRevolutTransactions } from "@/lib/revolut/reconcile";
import { itemLabel, normalizePayer } from "@/lib/revolut/match";

async function requireFinanceAdmin() {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "ADMIN") return null;
  if (await adminPermissionError("admin:financeiro:write")) return null;
  return user;
}

function refresh() {
  revalidatePath("/admin/financeiro", "layout");
  revalidatePath("/admin");
  revalidatePath("/dashboard/financeiro");
}

export async function syncRevolutNow(): Promise<void> {
  if (!(await requireFinanceAdmin())) return;
  await syncRevolutTransactions(createAdminClient());
  refresh();
}

/** Confirma a correspondência escolhida pelo admin: marca como pago e aprende quem paga por quem. */
export async function confirmBankMatch(formData: FormData): Promise<void> {
  const user = await requireFinanceAdmin();
  if (!user) return;
  const txId = String(formData.get("txId") ?? "");
  const itemKey = String(formData.get("itemKey") ?? "");
  if (!txId || !itemKey) return;
  const supabase = createAdminClient();
  const { data: tx } = await supabase.from("BankTransaction").select("id, matchStatus, payerName").eq("id", txId).maybeSingle();
  const row = tx as { id: string; matchStatus: string; payerName: string | null } | null;
  if (!row || row.matchStatus === "AUTO" || row.matchStatus === "CONFIRMED") return;

  const items = await loadPorReceberItems(supabase, currentReferenceMonthLisbon(new Date()));
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
    .eq("id", txId);
  const payerKey = normalizePayer(row.payerName);
  if (payerKey && it.studentId) {
    await supabase.from("BankPayerAlias").upsert({ payerKey, studentId: it.studentId }, { onConflict: "payerKey" });
  }
  refresh();
}

export async function ignoreBankTransaction(formData: FormData): Promise<void> {
  if (!(await requireFinanceAdmin())) return;
  const txId = String(formData.get("txId") ?? "");
  if (!txId) return;
  await createAdminClient().from("BankTransaction").update({ matchStatus: "IGNORED" }).eq("id", txId).in("matchStatus", ["SUGGESTED", "UNMATCHED"]);
  refresh();
}
