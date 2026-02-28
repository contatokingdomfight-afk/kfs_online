"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { revalidatePath } from "next/cache";

export type MissionResult = { error?: string; success?: boolean };

export async function createMission(
  _prev: MissionResult | null,
  formData: FormData
): Promise<MissionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Sem permissão." };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome da missão é obrigatório." };

  const description = (formData.get("description") as string)?.trim() || null;
  const modality = (formData.get("modality") as string)?.trim() || null;
  const beltIndexRaw = formData.get("beltIndex") as string | null;
  const beltIndex = beltIndexRaw === "" || beltIndexRaw === null ? null : parseInt(String(beltIndexRaw), 10);
  const xpReward = Math.max(0, parseInt(String(formData.get("xpReward") ?? 50), 10) || 50);
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? 0), 10) || 0;

  if (beltIndex != null && (Number.isNaN(beltIndex) || beltIndex < 0)) return { error: "Faixa inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("MissionTemplate").insert({
    name,
    description,
    modality,
    beltIndex,
    xpReward,
    sortOrder,
    isActive: true,
  });

  if (error) {
    console.error("createMission:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/missoes");
  return { success: true };
}

export async function deleteMission(missionId: string): Promise<MissionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Sem permissão." };
  if (!missionId) return { error: "ID em falta." };

  const supabase = await createClient();
  const { error } = await supabase.from("MissionTemplate").delete().eq("id", missionId);

  if (error) {
    console.error("deleteMission:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/missoes");
  return { success: true };
}
