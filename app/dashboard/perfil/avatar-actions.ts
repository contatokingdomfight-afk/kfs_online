"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import {
  getAvatarCosmeticsUnlockContext,
  validateAvatarConfig,
} from "@/lib/avatar-cosmetics";

export type SaveAvatarConfigResult = { error?: string; success?: boolean };

/** Grava a personalização do avatar de gamificação, revalidando a elegibilidade no servidor. */
export async function saveAvatarConfig(
  _prev: SaveAvatarConfigResult | null,
  formData: FormData
): Promise<SaveAvatarConfigResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();

  // Nunca confiar em XP/faixa vindos do cliente — recalcula sempre a partir da BD.
  const context = await getAvatarCosmeticsUnlockContext(supabase, studentId);
  const result = validateAvatarConfig(
    {
      gearColor: formData.get("gearColor"),
      headband: formData.get("headband"),
      showBeltSash: formData.get("showBeltSash"),
    },
    context
  );
  if (!result.ok) return { error: result.error };

  const { data: existing } = await supabase
    .from("Athlete")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("Athlete")
      .update({ avatarConfig: result.config })
      .eq("id", existing.id);
    if (error) {
      console.error("saveAvatarConfig update error:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("Athlete")
      .insert({ id: crypto.randomUUID(), studentId, xp: 0, avatarConfig: result.config });
    if (error) {
      console.error("saveAvatarConfig insert error:", error);
      return { error: error.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  return { success: true };
}
