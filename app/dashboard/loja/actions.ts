"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_PAYMENT_PROOF_TYPES, MAX_PAYMENT_PROOF_BYTES } from "@/lib/enrollment-form";
import { createRetailOrder, type OrderLineInput } from "@/lib/retail/orders";
import { findActiveCoupon } from "@/lib/retail/discounts.server";
import type { CouponRule } from "@/lib/retail/discounts";

export type OrderActionResult = { error?: string; success?: boolean };

/** Verifica um cupão antes de enviar (só pré-visualização; o servidor volta a validar ao criar). */
export async function checkCoupon(raw: string): Promise<{ coupon?: CouponRule; error?: string }> {
  const coupon = await findActiveCoupon(createAdminClient(), raw);
  return coupon ? { coupon } : { error: "Cupão inválido ou já não está ativo." };
}

function parseLines(raw: FormDataEntryValue | null): OrderLineInput[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]")) as { variantId?: unknown; quantity?: unknown; recipientNote?: unknown }[];
    return arr.map((l) => ({
      variantId: String(l.variantId ?? ""),
      quantity: Number(l.quantity ?? 0),
      recipientNote: l.recipientNote ? String(l.recipientNote) : null,
    }));
  } catch {
    return [];
  }
}

/** O aluno envia a encomenda (fica «Por pagar») e vai para a página dela, com os dados de pagamento. */
export async function createMyOrder(_prev: OrderActionResult | null, formData: FormData): Promise<OrderActionResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão expirada. Entra outra vez." };
  const supabase = createAdminClient();
  const { data: student } = await supabase.from("Student").select("schoolId").eq("id", studentId).maybeSingle();

  const result = await createRetailOrder(supabase, {
    lines: parseLines(formData.get("lines")),
    schoolId: (student as { schoolId?: string | null } | null)?.schoolId ?? null,
    studentId,
    notes: (formData.get("notes") as string | null) ?? null,
    couponCode: (formData.get("couponCode") as string | null) ?? null,
  });
  if (result.error || !result.id) return { error: result.error ?? "Não foi possível enviar a encomenda." };
  revalidatePath("/dashboard/loja");
  revalidatePath("/admin/loja/encomendas");
  redirect(`/dashboard/loja/encomendas/${result.id}?nova=1`);
}

/** Encomenda do próprio: do aluno (studentId) ou de quem a criou na loja pública (createdByUserId). */
async function ownOrder(orderId: string) {
  if (!orderId) return null;
  const [studentId, dbUser] = await Promise.all([getCurrentStudentId(), getCurrentDbUser()]);
  if (!studentId && !dbUser) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from("RetailOrder").select("id, status, studentId, createdByUserId, proofPath").eq("id", orderId).maybeSingle();
  const row = data as { id: string; status: string; studentId: string | null; createdByUserId: string | null; proofPath: string | null } | null;
  if (!row) return null;
  const mine = (studentId != null && row.studentId === studentId) || (dbUser != null && row.createdByUserId === dbUser.id);
  if (!mine) return null;
  return { supabase, row, studentId };
}

/** Comprovativo da transferência (opcional): imagem ou PDF, até 8 MB. */
export async function uploadOrderProof(_prev: OrderActionResult | null, formData: FormData): Promise<OrderActionResult> {
  const own = await ownOrder(String(formData.get("orderId") ?? ""));
  if (!own) return { error: "Encomenda não encontrada." };
  if (own.row.status !== "PENDING_PAYMENT") return { error: "Esta encomenda já não está por pagar." };
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolhe o ficheiro do comprovativo." };
  if (!ALLOWED_PAYMENT_PROOF_TYPES.has(file.type)) return { error: "Formato não suportado. Usa JPEG, PNG, WebP ou PDF." };
  if (file.size > MAX_PAYMENT_PROOF_BYTES) return { error: "Ficheiro demasiado grande (máx. 8 MB)." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `orders/${own.row.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await own.supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { error: "Não foi possível enviar o comprovativo. Tenta outra vez." };
  if (own.row.proofPath) await own.supabase.storage.from("payment-proofs").remove([own.row.proofPath]);
  const now = new Date().toISOString();
  await own.supabase
    .from("RetailOrder")
    .update({ proofPath: path, proofFileName: file.name.slice(0, 120), proofUploadedAt: now, updatedAt: now })
    .eq("id", own.row.id);
  revalidatePath(`/dashboard/loja/encomendas/${own.row.id}`);
  revalidatePath(`/loja/encomendas/${own.row.id}`);
  revalidatePath("/admin/loja/encomendas");
  return { success: true };
}

/** O aluno só cancela enquanto está «Por pagar»; depois de paga, só o admin. */
export async function cancelMyOrder(formData: FormData): Promise<void> {
  const own = await ownOrder(String(formData.get("orderId") ?? ""));
  if (!own || own.row.status !== "PENDING_PAYMENT") return;
  const now = new Date().toISOString();
  await own.supabase.from("RetailOrder").update({ status: "CANCELLED", cancelledAt: now, updatedAt: now }).eq("id", own.row.id);
  revalidatePath("/dashboard/loja");
  revalidatePath(`/dashboard/loja/encomendas/${own.row.id}`);
  revalidatePath(`/loja/encomendas/${own.row.id}`);
  revalidatePath("/admin/loja/encomendas");
}
