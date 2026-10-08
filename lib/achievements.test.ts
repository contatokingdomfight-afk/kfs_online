import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, getAchievementsWithStatus, type AchievementUnlockContext } from "@/lib/achievements";

const base: AchievementUnlockContext = {
  studentId: "s1",
  athleteXp: 0,
  hasPhysicalAssessment: false,
  missionsCompletedCount: 0,
  streakDays: 0,
  totalClasses: 0,
  consecutiveWeeks: 0,
  graduationsPassed: 0,
};

function unlocked(ctx: Partial<AchievementUnlockContext>): string[] {
  return getAchievementsWithStatus({ ...base, ...ctx })
    .filter((a) => a.isUnlocked)
    .map((a) => a.id);
}

describe("conquistas", () => {
  it("já não há conquistas por faixa (sistema antigo por XP)", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const old of ["faixa_verde", "faixa_azul", "elite", "lenda"]) expect(ids).not.toContain(old);
  });

  it("primeira graduação só com exame aprovado", () => {
    expect(unlocked({})).not.toContain("primeira_graduacao");
    expect(unlocked({ graduationsPassed: 1 })).toContain("primeira_graduacao");
  });

  it("50 aulas e imparável (12 semanas seguidas)", () => {
    expect(unlocked({ totalClasses: 49 })).not.toContain("50_aulas");
    expect(unlocked({ totalClasses: 50 })).toContain("50_aulas");
    expect(unlocked({ consecutiveWeeks: 11 })).not.toContain("imparavel");
    expect(unlocked({ consecutiveWeeks: 12 })).toContain("imparavel");
  });

  it("lenda kingdom pede 200 aulas e 2 graduações", () => {
    expect(unlocked({ totalClasses: 200, graduationsPassed: 1 })).not.toContain("lenda_kingdom");
    expect(unlocked({ totalClasses: 199, graduationsPassed: 2 })).not.toContain("lenda_kingdom");
    expect(unlocked({ totalClasses: 200, graduationsPassed: 2 })).toContain("lenda_kingdom");
  });
});
