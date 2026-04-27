import { buildBodyScaleFactors } from "@/components/avatar/avatar-utils";
import { formDataProfileToAvatarScales } from "@/lib/illustrative-body-2d-pipeline";
import { computeGlobalBodyScale, type ProfileBodyMetrics } from "@/lib/illustrative-body-silhouette";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

export type AnatomicalIllustrationTransform = {
  transform: string;
  transformOrigin: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Escala CSS sobre a ilustração anatómica (SVG único) a partir da mesma lógica que a antiga silhueta modular:
 * factores por região + altura/peso. Não altera vértices do SVG — só `transform` global ancorado ao torso.
 */
export function computeAnatomicalIllustrationTransform(args: {
  formData: Partial<PhysicalAssessmentFormData>;
  profile: ProfileBodyMetrics | null;
  neutralReference: boolean;
}): AnatomicalIllustrationTransform {
  const origin = "50% 16%";

  if (args.neutralReference) {
    const g = computeGlobalBodyScale(args.profile?.heightCm ?? null, args.profile?.weightKg ?? null);
    const u = clamp(g, 0.86, 1.12);
    return { transform: `scale(${u}, ${u})`, transformOrigin: origin };
  }

  const { measurements } = formDataProfileToAvatarScales(args.formData, args.profile);
  const s = buildBodyScaleFactors(measurements);
  const torso = (s.shoulder + s.chest + s.waist + s.hip) / 4;
  const scaleX = clamp(torso * Math.sqrt(s.bulk), 0.8, 1.24);
  const scaleY = clamp(s.height * 0.52 + s.legInseam * 0.33 + ((s.thigh + s.calf) / 2) * 0.15, 0.82, 1.22);
  return { transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: origin };
}
