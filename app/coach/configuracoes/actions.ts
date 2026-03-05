"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { revalidatePath } from "next/cache";

export type SaveCoachProfileResult = { error?: string; success?: boolean };

export async function saveCoachProfile(
  _prev: SaveCoachProfileResult | null,
  formData: FormData
): Promise<SaveCoachProfileResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida. Faz login." };
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") return { error: "Acesso negado." };

  const name = (formData.get("name") as string)?.trim() || null;
  const avatarUrl = (formData.get("avatarUrl") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim() || null;

  const supabase = await createClient();

  const { error: userError } = await supabase
    .from("User")
    .update({ name, avatarUrl: avatarUrl || null })
    .eq("id", dbUser.id);
  if (userError) {
    console.error("saveCoachProfile user update error:", userError);
    return { error: userError.message };
  }

  const coachId = await getCurrentCoachId();
  if (coachId) {
    const { error: coachError } = await supabase
      .from("Coach")
      .update({
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
      })
      .eq("id", coachId);
    if (coachError) {
      console.error("saveCoachProfile coach update error:", coachError);
      return { error: coachError.message };
    }
  }

  revalidatePath("/coach");
  revalidatePath("/coach/configuracoes");
  return { success: true };
}
