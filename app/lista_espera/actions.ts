"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type JoinWaitlistResult = { success?: true; error?: string };

export async function joinWaitlist(
  _prev: JoinWaitlistResult | null,
  formData: FormData
): Promise<JoinWaitlistResult> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const marketingOptin = formData.get("marketing_optin") === "on";
  const sourceParam = (formData.get("source") as string)?.trim() || "";

  if (!name) return { error: "Nome é obrigatório." };
  if (!email) return { error: "Email é obrigatório." };
  if (!EMAIL_REGEX.test(email)) return { error: "Email inválido." };

  const source = sourceParam === "instagram" ? "instagram_ads" : sourceParam || "instagram_ads";

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Ocorreu um erro. Tente novamente." };
  }

  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (existing) return { error: "Este email já está na lista de espera." };

  const { error } = await supabase.from("waitlist").insert({
    name,
    email,
    phone,
    city,
    marketing_optin: marketingOptin,
    source,
  });

  if (error) return { error: "Ocorreu um erro. Tente novamente." };
  return { success: true };
}
