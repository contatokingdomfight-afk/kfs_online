import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

/** Ritmo de corrida em minutos por quilómetro (ex.: 6,5 = 6 min 30 s por km). */
export function getRunPaceMinPerKm(d: Partial<PhysicalAssessmentFormData> | null | undefined): number | null {
  if (!d) return null;
  const pace = d.runPaceMinPerKm;
  if (typeof pace === "number" && pace > 0) return pace;
  const legacyMeters = d.runDistance1minMeters;
  if (typeof legacyMeters === "number" && legacyMeters > 0) {
    return 1000 / legacyMeters;
  }
  return null;
}

export function runMetersPerMinFromPace(paceMinPerKm: number): number {
  return 1000 / paceMinPerKm;
}

export function formatRunPaceMinPerKm(pace: number, locale: "pt" | "en"): string {
  if (!Number.isFinite(pace) || pace <= 0) return "—";
  const str =
    pace >= 100
      ? String(Math.round(pace))
      : locale === "pt"
        ? pace.toLocaleString("pt-PT", { maximumFractionDigits: 2, minimumFractionDigits: 0 })
        : pace.toLocaleString("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  return locale === "pt" ? `${str} min/km` : `${str} min/km`;
}
