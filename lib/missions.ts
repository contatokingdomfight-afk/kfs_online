import type { SupabaseClient } from "@supabase/supabase-js";
import { getBeltIndexFromXp } from "@/lib/belts";

export type MissionTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  modality: string | null;
  beltIndex: number | null;
  xpReward: number;
  sortOrder: number;
  isActive: boolean;
};

/**
 * Missões de modelo que se aplicam a um atleta: mesma faixa (ou qualquer) e mesma modalidade (ou todas).
 */
export async function getApplicableMissionTemplates(
  supabase: SupabaseClient,
  athleteId: string,
  athleteXp: number,
  primaryModality: string | null
): Promise<MissionTemplateRow[]> {
  const beltIndex = getBeltIndexFromXp(athleteXp);

  const { data: templates } = await supabase
    .from("MissionTemplate")
    .select("id, name, description, modality, beltIndex, xpReward, sortOrder, isActive")
    .eq("isActive", true)
    .order("sortOrder", { ascending: true });

  if (!templates?.length) return [];

  const { data: completed } = await supabase
    .from("AthleteMissionCompletion")
    .select("missionTemplateId")
    .eq("athleteId", athleteId);

  const completedIds = new Set((completed ?? []).map((r) => r.missionTemplateId));

  return templates
    .filter((t) => {
      if (completedIds.has(t.id)) return false;
      if (t.modality != null && t.modality !== primaryModality) return false;
      if (t.beltIndex != null && t.beltIndex !== beltIndex) return false;
      return true;
    })
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      modality: t.modality ?? null,
      beltIndex: t.beltIndex ?? null,
      xpReward: t.xpReward ?? 50,
      sortOrder: t.sortOrder ?? 0,
      isActive: t.isActive ?? true,
    }));
}

/**
 * Marca uma missão de modelo como concluída pelo atleta e atribui XP.
 */
export async function completeCustomMission(
  supabase: SupabaseClient,
  athleteId: string,
  missionTemplateId: string
): Promise<{ error?: string; xpAwarded?: number }> {
  const { data: template } = await supabase
    .from("MissionTemplate")
    .select("id, xpReward, isActive")
    .eq("id", missionTemplateId)
    .single();

  if (!template || !template.isActive)
    return { error: "Missão não encontrada ou inativa." };

  const { data: existing } = await supabase
    .from("AthleteMissionCompletion")
    .select("id")
    .eq("athleteId", athleteId)
    .eq("missionTemplateId", missionTemplateId)
    .maybeSingle();

  if (existing) return { error: "Missão já foi concluída." };

  const xpReward = (template.xpReward as number) ?? 50;

  const { error: insertErr } = await supabase.from("AthleteMissionCompletion").insert({
    athleteId,
    missionTemplateId,
    xpAwarded: xpReward,
  });

  if (insertErr) return { error: insertErr.message };

  const { data: athlete } = await supabase.from("Athlete").select("xp").eq("id", athleteId).single();
  const currentXp = (athlete?.xp as number | null) ?? 0;
  await supabase.from("Athlete").update({ xp: currentXp + xpReward }).eq("id", athleteId);

  return { xpAwarded: xpReward };
}
