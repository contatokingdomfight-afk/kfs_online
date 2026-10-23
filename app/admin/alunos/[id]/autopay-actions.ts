"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelAutoPay, loadAutoPayForStudent, setAutoPayBillingDay, syncAutoPaySafe } from "@/lib/autopay/service";

async function requireFinanceAdmin(): Promise<boolean> {
  const u = await getCurrentDbUser();
  if (!u || u.role !== "ADMIN") return false;
  return !(await adminPermissionError("admin:financeiro:write"));
}

function refresh(studentId: string) {
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/financeiro", "layout");
}

/** Admin muda o dia de cobrança do pagamento automático (move já a próxima cobrança). */
export async function setAutoPayBillingDayAction(formData: FormData): Promise<void> {
  if (!(await requireFinanceAdmin())) return;
  const payerId = String(formData.get("payerStudentId") ?? "");
  const pageStudentId = String(formData.get("studentId") ?? payerId);
  const day = Number(formData.get("billingDay"));
  const supabase = createAdminClient();
  const row = await loadAutoPayForStudent(supabase, payerId);
  if (!row) return;
  const res = await setAutoPayBillingDay(supabase, row, day);
  if (res.error) console.error("[autopay admin] dia", res.error);
  refresh(pageStudentId);
}

/** Volta a ler a subscrição na Revolut (útil se um webhook se perdeu). */
export async function syncAutoPayAction(formData: FormData): Promise<void> {
  if (!(await requireFinanceAdmin())) return;
  const payerId = String(formData.get("payerStudentId") ?? "");
  const pageStudentId = String(formData.get("studentId") ?? payerId);
  const supabase = createAdminClient();
  const row = await loadAutoPayForStudent(supabase, payerId);
  if (row) await syncAutoPaySafe(supabase, row);
  refresh(pageStudentId);
}

export async function cancelAutoPayAdminAction(formData: FormData): Promise<void> {
  if (!(await requireFinanceAdmin())) return;
  const payerId = String(formData.get("payerStudentId") ?? "");
  const pageStudentId = String(formData.get("studentId") ?? payerId);
  const supabase = createAdminClient();
  const row = await loadAutoPayForStudent(supabase, payerId);
  if (row) await cancelAutoPay(supabase, row);
  refresh(pageStudentId);
}
