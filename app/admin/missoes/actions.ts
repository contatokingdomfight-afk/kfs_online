"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { revalidatePath } from "next/cache";
import { SEED_MISSIONS } from "./seed-missions-data";

const MISSION_TABLE = "MissionTemplate";

export type MissionResult = { error?: string; success?: boolean };

export type SeedMissionsResult = { error?: string; inserted?: number; skipped?: number };

/** Importa as missões padrão do DOCS/MISSOES.md. Só insere se o nome ainda não existir. */
export async function seedMissionsFromDoc(): Promise<SeedMissionsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Sem permissão." };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Configuração do servidor em falta (SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const { data: existing } = await supabase.from(MISSION_TABLE).select("name");
  const existingNames = new Set((existing ?? []).map((r) => r.name.trim().toLowerCase()));

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < SEED_MISSIONS.length; i++) {
    const m = SEED_MISSIONS[i];
    const key = m.name.trim().toLowerCase();
    if (existingNames.has(key)) {
      skipped++;
      continue;
    }
    const { error } = await supabase.from(MISSION_TABLE).insert({
      name: m.name,
      description: m.description,
      modality: m.modality,
      beltIndex: m.beltIndex,
      xpReward: m.xpReward,
      sortOrder: i,
      isActive: true,
    });
    if (error) {
      console.error("seedMissionsFromDoc:", error);
      return { error: error.message, inserted, skipped };
    }
    inserted++;
    existingNames.add(key);
  }

  revalidatePath("/admin/missoes");
  return { inserted, skipped };
}

/** Wrapper para useFormState (recebe prev e formData). */
export async function runSeedMissions(
  _prev: SeedMissionsResult | null,
  _formData: FormData
): Promise<SeedMissionsResult> {
  return seedMissionsFromDoc();
}

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

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Configuração do servidor em falta (SUPABASE_SERVICE_ROLE_KEY)." };
  }
  const { error } = await supabase.from(MISSION_TABLE).insert({
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

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Configuração do servidor em falta (SUPABASE_SERVICE_ROLE_KEY)." };
  }
  const { error } = await supabase.from(MISSION_TABLE).delete().eq("id", missionId);

  if (error) {
    console.error("deleteMission:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/missoes");
  return { success: true };
}
