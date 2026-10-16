"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRetailOrder, type OrderLineInput } from "@/lib/retail/orders";
import { isProfileComplete, loadShopProfile } from "@/lib/retail/public-shop";

export type ShopActionResult = { error?: string; success?: boolean };

function safeNext(raw: FormDataEntryValue | null): string {
  const n = String(raw ?? "");
  return n.startsWith("/loja") && !n.startsWith("//") ? n : "/loja";
}

/** Cadastro mínimo (contacto + morada) exigido antes de confirmar a primeira encomenda. */
export async function saveShopProfile(_prev: ShopActionResult | null, formData: FormData): Promise<ShopActionResult> {
  const user = await getCurrentDbUser();
  if (!user) return { error: "Sessão expirada. Entra outra vez." };
  const field = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const fullName = field("fullName", 120);
  const phone = field("phone", 30);
  const addressLine = field("addressLine", 200);
  const postalCode = field("postalCode", 20);
  const city = field("city", 80);
  if (!fullName || !phone || !addressLine || !postalCode || !city) return { error: "Preenche todos os campos." };
  if (phone.replace(/\D/g, "").length < 9) return { error: "Telefone inválido." };
  if (!/^\d{4}-\d{3}$/.test(postalCode)) return { error: "Código postal no formato 0000-000." };

  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("ShopCustomerProfile")
    .upsert({ userId: user.id, fullName, phone, addressLine, postalCode, city, updatedAt: now }, { onConflict: "userId" });
  if (error) return { error: "Não foi possível guardar. Tenta outra vez." };
  redirect(safeNext(formData.get("next")));
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

/** Encomenda da loja pública: qualquer conta com cadastro completo. Fica «Por pagar» (IBAN/secretaria). */
export async function createShopOrder(_prev: ShopActionResult | null, formData: FormData): Promise<ShopActionResult> {
  const user = await getCurrentDbUser();
  if (!user) return { error: "Sessão expirada. Entra outra vez." };
  const admin = createAdminClient();
  const profile = await loadShopProfile(admin, user.id);
  if (!isProfileComplete(profile)) return { error: "Completa primeiro o teu cadastro (contacto e morada)." };

  const studentId = await getCurrentStudentId();
  const { data: student } = studentId ? await admin.from("Student").select("schoolId").eq("id", studentId).maybeSingle() : { data: null };
  const userNotes = String(formData.get("notes") ?? "").trim();
  const contact = `Morada: ${profile.addressLine}, ${profile.postalCode} ${profile.city}`;

  const result = await createRetailOrder(admin, {
    lines: parseLines(formData.get("lines")),
    schoolId: (student as { schoolId?: string | null } | null)?.schoolId ?? null,
    studentId,
    customerName: profile.fullName,
    customerPhone: profile.phone,
    notes: userNotes ? `${userNotes}\n${contact}` : contact,
    createdByUserId: user.id,
    couponCode: (formData.get("couponCode") as string | null) ?? null,
  });
  if (result.error || !result.id) return { error: result.error ?? "Não foi possível enviar a encomenda." };
  revalidatePath("/admin/loja/encomendas");
  redirect(`/loja/encomendas/${result.id}?nova=1`);
}
