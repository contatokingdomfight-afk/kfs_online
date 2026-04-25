/**
 * Ponto único documentado: ficha (6.4 + altura/peso opcionais) + métricas de perfil
 * → medidas canónicas do avatar modular → `BodyScaleFactors` usados em `Body.tsx`,
 * `Avatar.tsx`, `TechnicalRigSvg` e no rig 3D (via `buildAvatarPoseLayout`).
 * Ver `DOCS/SILHUETA_CORPORAL_2D_ILUSTRATIVA.md`.
 */
import {
  buildBodyScaleFactors,
  mapFormDataToAvatarMeasurements,
  type AvatarMeasurements,
  type BodyScaleFactors,
} from "@/components/avatar/avatar-utils";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

export type ProfileHeightWeight = { heightCm?: number | null; weightKg?: number | null } | null;

export type Illustrative2DPipelineResult = {
  measurements: AvatarMeasurements;
  scales: BodyScaleFactors;
};

export function formDataProfileToAvatarScales(
  fd: Partial<PhysicalAssessmentFormData>,
  profile?: ProfileHeightWeight
): Illustrative2DPipelineResult {
  const measurements = mapFormDataToAvatarMeasurements(fd, profile ?? null);
  const scales = buildBodyScaleFactors(measurements);
  return { measurements, scales };
}
