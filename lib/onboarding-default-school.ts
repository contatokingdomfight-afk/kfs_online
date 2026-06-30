/**
 * Escola presencial pré-selecionada no onboarding (passo «A sua escola»).
 * O nome canónico em produção pode ser «Sede presencial» ou «Sede Principal».
 */
export const DEFAULT_ONBOARDING_SCHOOL_NAME = "Sede presencial";

function norm(name: string): string {
  return name.trim().toLowerCase();
}

function isOnlineSchoolName(name: string): boolean {
  return norm(name).includes("online");
}

function isPresencialSchoolName(name: string): boolean {
  const n = norm(name);
  if (isOnlineSchoolName(n)) return false;
  return n.includes("sede") || n.includes("presencial") || n.includes("principal");
}

/** Presencial primeiro; online por último; resto por nome. */
export function sortSchoolsForOnboarding<T extends { id: string; name: string | null }>(
  schools: T[]
): T[] {
  return [...schools].sort((a, b) => {
    const aPres = isPresencialSchoolName(a.name ?? "");
    const bPres = isPresencialSchoolName(b.name ?? "");
    const aOnline = isOnlineSchoolName(a.name ?? "");
    const bOnline = isOnlineSchoolName(b.name ?? "");
    if (aPres && !bPres) return -1;
    if (!aPres && bPres) return 1;
    if (aOnline && !bOnline) return 1;
    if (!aOnline && bOnline) return -1;
    return (a.name ?? "").localeCompare(b.name ?? "", "pt");
  });
}

export function getDefaultOnboardingSchoolId(schools: { id: string; name: string | null }[]): string {
  const sorted = sortSchoolsForOnboarding(schools);
  if (sorted.length === 0) return "";

  const target = norm(DEFAULT_ONBOARDING_SCHOOL_NAME);
  const exact = sorted.find((s) => norm(s.name ?? "") === target);
  if (exact) return exact.id;

  const presencial = sorted.find((s) => isPresencialSchoolName(s.name ?? ""));
  if (presencial) return presencial.id;

  return sorted[0].id;
}
