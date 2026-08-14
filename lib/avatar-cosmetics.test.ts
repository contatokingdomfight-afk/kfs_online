import { describe, expect, it } from "vitest";
import {
  getCosmeticOptionsWithStatus,
  validateAvatarConfig,
  normalizeAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
} from "./avatar-cosmetics";
import { getXpThresholdForBeltIndex } from "./belts";

describe("getCosmeticOptionsWithStatus", () => {
  it("aluno com 0 XP só tem as opções 'always' desbloqueadas", () => {
    const options = getCosmeticOptionsWithStatus({ athleteXp: 0 });
    const unlockedIds = options.filter((o) => o.isUnlocked).map((o) => o.id);
    expect(unlockedIds.sort()).toEqual(["gear_default", "gear_red", "headband_classic", "headband_none"].sort());
  });

  it("desbloqueia gear_black exatamente no limiar da faixa Azul (índice 6)", () => {
    const xpBefore = getXpThresholdForBeltIndex(6) - 1;
    const xpAt = getXpThresholdForBeltIndex(6);

    const before = getCosmeticOptionsWithStatus({ athleteXp: xpBefore });
    const at = getCosmeticOptionsWithStatus({ athleteXp: xpAt });

    expect(before.find((o) => o.id === "gear_black")?.isUnlocked).toBe(false);
    expect(at.find((o) => o.id === "gear_black")?.isUnlocked).toBe(true);
  });

  it("desbloqueia gear_gold só na faixa Preta (índice 10)", () => {
    const almostBlack = getXpThresholdForBeltIndex(10) - 1;
    const black = getXpThresholdForBeltIndex(10);

    expect(getCosmeticOptionsWithStatus({ athleteXp: almostBlack }).find((o) => o.id === "gear_gold")?.isUnlocked).toBe(false);
    expect(getCosmeticOptionsWithStatus({ athleteXp: black }).find((o) => o.id === "gear_gold")?.isUnlocked).toBe(true);
  });

  it("desbloqueia headband_champion exatamente aos 50000 XP", () => {
    expect(getCosmeticOptionsWithStatus({ athleteXp: 49999 }).find((o) => o.id === "headband_champion")?.isUnlocked).toBe(false);
    expect(getCosmeticOptionsWithStatus({ athleteXp: 50000 }).find((o) => o.id === "headband_champion")?.isUnlocked).toBe(true);
  });
});

describe("validateAvatarConfig", () => {
  const zeroXpContext = { athleteXp: 0 };

  it("aceita uma opção desbloqueada", () => {
    const result = validateAvatarConfig({ gearColor: "gear_red", headband: "headband_classic", showBeltSash: true }, zeroXpContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config).toEqual({ gearColor: "gear_red", headband: "headband_classic", showBeltSash: true });
    }
  });

  it("rejeita uma opção trancada (gear_gold sem faixa preta)", () => {
    const result = validateAvatarConfig({ gearColor: "gear_gold" }, zeroXpContext);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/desbloqueada/);
    }
  });

  it("rejeita um id que não existe no catálogo", () => {
    const result = validateAvatarConfig({ headband: "headband_inexistente" }, zeroXpContext);
    expect(result.ok).toBe(false);
  });

  it("rejeita um id pertencente a outra categoria", () => {
    const result = validateAvatarConfig({ gearColor: "headband_none" }, zeroXpContext);
    expect(result.ok).toBe(false);
  });

  it("sem campos submetidos, usa os valores por omissão", () => {
    const result = validateAvatarConfig({}, zeroXpContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config).toEqual(DEFAULT_AVATAR_CONFIG);
    }
  });
});

describe("normalizeAvatarConfig", () => {
  it("devolve os valores por omissão quando a BD tem null", () => {
    expect(normalizeAvatarConfig(null)).toEqual(DEFAULT_AVATAR_CONFIG);
  });

  it("preserva campos válidos e ignora campos desconhecidos", () => {
    expect(normalizeAvatarConfig({ gearColor: "gear_red", extra: "ignorado" })).toEqual({
      gearColor: "gear_red",
      headband: DEFAULT_AVATAR_CONFIG.headband,
      showBeltSash: false,
    });
  });
});
