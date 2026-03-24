/**
 * Escola online pré-selecionada no onboarding (primeiro acesso).
 * O nome deve corresponder ao registo em `School.name` na base.
 */
export const DEFAULT_ONBOARDING_SCHOOL_NAME = "Kingdom Fight School - Online";

export function getDefaultOnboardingSchoolId(schools: { id: string; name: string | null }[]): string {
  if (schools.length === 0) return "";
  const norm = (x: string) => x.trim().toLowerCase();
  const target = norm(DEFAULT_ONBOARDING_SCHOOL_NAME);
  const exact = schools.find((s) => norm(s.name ?? "") === target);
  if (exact) return exact.id;
  const fuzzy = schools.find((s) => {
    const n = norm(s.name ?? "");
    return n.includes("online") && (n.includes("kingdom") || n.includes("fight"));
  });
  if (fuzzy) return fuzzy.id;
  return schools[0].id;
}
