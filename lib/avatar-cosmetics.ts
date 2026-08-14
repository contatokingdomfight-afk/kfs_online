/**
 * Catálogo de cosméticos do avatar de gamificação + elegibilidade.
 * Mesmo padrão de `lib/achievements.ts`: catálogo estático + contexto do aluno →
 * estado calculado na hora (sem tabela de "desbloqueados" persistida).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBeltIndexFromXp, getBeltName } from "@/lib/belts";

export type AvatarCosmeticSlot = "gearColor" | "headband";

export type CosmeticUnlockCondition =
  | { type: "always" }
  | { type: "belt_level"; beltIndex: number }
  | { type: "xp_milestone"; xp: number };

export type CosmeticOption = {
  id: string;
  slot: AvatarCosmeticSlot;
  name: string;
  icon?: string;
  /** Cor hex (gearColor) ou chave de forma (headband) usada na renderização SVG. */
  value: string;
  unlock: CosmeticUnlockCondition;
};

export type CosmeticOptionWithStatus = CosmeticOption & { isUnlocked: boolean; unlockHint: string | null };

export const COSMETIC_CATALOG: CosmeticOption[] = [
  // Cor do equipamento (luvas / wraps)
  { id: "gear_default", slot: "gearColor", name: "Padrão", icon: "⚪", value: "var(--avatar-gear)", unlock: { type: "always" } },
  { id: "gear_red", slot: "gearColor", name: "Vermelho", icon: "🔴", value: "#dc2626", unlock: { type: "always" } },
  { id: "gear_black", slot: "gearColor", name: "Preto", icon: "⚫", value: "#111827", unlock: { type: "belt_level", beltIndex: 6 } },
  { id: "gear_gold", slot: "gearColor", name: "Dourado", icon: "🟡", value: "#d4af37", unlock: { type: "belt_level", beltIndex: 10 } },

  // Bandana
  { id: "headband_none", slot: "headband", name: "Nenhuma", icon: "—", value: "none", unlock: { type: "always" } },
  { id: "headband_classic", slot: "headband", name: "Clássica", icon: "🎽", value: "classic", unlock: { type: "always" } },
  { id: "headband_champion", slot: "headband", name: "Faixa de Campeão", icon: "🏆", value: "champion", unlock: { type: "xp_milestone", xp: 50000 } },
];

export const DEFAULT_AVATAR_CONFIG: AvatarCosmeticConfig = {
  gearColor: "gear_default",
  headband: "headband_none",
  showBeltSash: false,
};

export type AvatarCosmeticConfig = {
  gearColor: string;
  headband: string;
  showBeltSash: boolean;
};

export type AvatarCosmeticsUnlockContext = { athleteXp: number };

function isUnlocked(condition: CosmeticUnlockCondition, context: AvatarCosmeticsUnlockContext): boolean {
  switch (condition.type) {
    case "always":
      return true;
    case "belt_level":
      return getBeltIndexFromXp(context.athleteXp) >= condition.beltIndex;
    case "xp_milestone":
      return context.athleteXp >= condition.xp;
    default:
      return false;
  }
}

function unlockHintFor(condition: CosmeticUnlockCondition): string | null {
  switch (condition.type) {
    case "always":
      return null;
    case "belt_level":
      return `Desbloqueia na faixa ${getBeltName(condition.beltIndex)}`;
    case "xp_milestone":
      return `Desbloqueia aos ${condition.xp.toLocaleString("pt-PT")} XP`;
    default:
      return null;
  }
}

/** Calcula quais opções de cosmético estão desbloqueadas com base no contexto. Função pura. */
export function getCosmeticOptionsWithStatus(
  context: AvatarCosmeticsUnlockContext
): CosmeticOptionWithStatus[] {
  return COSMETIC_CATALOG.map((option) => ({
    ...option,
    isUnlocked: isUnlocked(option.unlock, context),
    unlockHint: unlockHintFor(option.unlock),
  }));
}

/** Busca só o XP do atleta — contexto mínimo para elegibilidade de cosméticos. */
export async function getAvatarCosmeticsUnlockContext(
  supabase: SupabaseClient,
  studentId: string
): Promise<AvatarCosmeticsUnlockContext> {
  const { data } = await supabase.from("Athlete").select("xp").eq("studentId", studentId).maybeSingle();
  return { athleteXp: (data?.xp as number | null) ?? 0 };
}

export type ValidateAvatarConfigResult = { ok: true; config: AvatarCosmeticConfig } | { ok: false; error: string };

/**
 * Valida uma configuração de avatar submetida contra o catálogo + elegibilidade atual.
 * Nunca confia em `isUnlocked`/XP vindo do cliente — recalcula tudo a partir de `context`.
 */
export function validateAvatarConfig(
  submitted: { gearColor?: unknown; headband?: unknown; showBeltSash?: unknown },
  context: AvatarCosmeticsUnlockContext
): ValidateAvatarConfigResult {
  const options = getCosmeticOptionsWithStatus(context);

  function resolveSlot(slot: AvatarCosmeticSlot, submittedId: unknown, fallbackId: string): string | { error: string } {
    if (submittedId == null) return fallbackId;
    if (typeof submittedId !== "string") return { error: "Opção inválida." };
    const option = options.find((o) => o.slot === slot && o.id === submittedId);
    if (!option) return { error: "Opção inválida." };
    if (!option.isUnlocked) return { error: "Essa opção ainda não está desbloqueada." };
    return option.id;
  }

  const gearColor = resolveSlot("gearColor", submitted.gearColor, DEFAULT_AVATAR_CONFIG.gearColor);
  if (typeof gearColor !== "string") return { ok: false, error: gearColor.error };

  const headband = resolveSlot("headband", submitted.headband, DEFAULT_AVATAR_CONFIG.headband);
  if (typeof headband !== "string") return { ok: false, error: headband.error };

  return {
    ok: true,
    config: {
      gearColor,
      headband,
      showBeltSash: submitted.showBeltSash === true || submitted.showBeltSash === "on",
    },
  };
}

/** Resolve o valor renderizável (cor/forma) de uma opção pelo id — usado pelo <Avatar>. */
export function getCosmeticValue(slot: AvatarCosmeticSlot, id: string | null | undefined): string {
  const fallback = slot === "gearColor" ? DEFAULT_AVATAR_CONFIG.gearColor : DEFAULT_AVATAR_CONFIG.headband;
  const option = COSMETIC_CATALOG.find((o) => o.slot === slot && o.id === (id ?? fallback));
  return option?.value ?? (COSMETIC_CATALOG.find((o) => o.slot === slot && o.id === fallback)?.value ?? "none");
}

/** Normaliza `Athlete.avatarConfig` (pode vir null/parcial da BD) com os valores por omissão. */
export function normalizeAvatarConfig(raw: unknown): AvatarCosmeticConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_AVATAR_CONFIG };
  const r = raw as Record<string, unknown>;
  return {
    gearColor: typeof r.gearColor === "string" ? r.gearColor : DEFAULT_AVATAR_CONFIG.gearColor,
    headband: typeof r.headband === "string" ? r.headband : DEFAULT_AVATAR_CONFIG.headband,
    showBeltSash: r.showBeltSash === true,
  };
}
