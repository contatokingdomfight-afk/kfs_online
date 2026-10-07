"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { parseXpRulesInput, XP_SOURCES } from "@/lib/xp-rules";

export type SaveXpRulesResult = { error?: string; success?: boolean };

export async function saveXpRules(_prev: SaveXpRulesResult | null, formData: FormData): Promise<SaveXpRulesResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:sistema:write");
  if (permErr) return { error: permErr };

  const parsed = parseXpRulesInput(Object.fromEntries(XP_SOURCES.map((s) => [s, formData.get(s)])));
  if (!parsed.ok) return { error: parsed.error };

  const supabase = getAdminClientOrNull().client;
  if (!supabase) return { error: "Configuração Supabase em falta." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("XpRule")
    .upsert(XP_SOURCES.map((source) => ({ source, xp: parsed.rules[source], updatedAt: now })), { onConflict: "source" });
  if (error) {
    console.error("saveXpRules:", error);
    return { error: "Não foi possível guardar as regras." };
  }
  revalidatePath("/admin/xp");
  revalidatePath("/dashboard/rank");
  return { success: true };
}
