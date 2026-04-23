import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

/**
 * Há conteúdo na ficha para além das circunferências (6.4): anamnese, PAR-Q, sinais vitais, testes, etc.
 * Usado para copy na performance (ficha preenchida mas sem medidas para silhueta personalizada).
 */
export function hasAnamnesisOrNonAnthroAssessmentContent(
  d: Partial<PhysicalAssessmentFormData> | null | undefined
): boolean {
  if (!d || typeof d !== "object") return false;

  if (Array.isArray(d.objectives) && d.objectives.length > 0) return true;
  if (d.objectiveOther?.trim()) return true;

  if (Array.isArray(d.medicalConditions) && d.medicalConditions.length > 0) return true;
  if (d.medicalConditionsOther?.trim()) return true;
  if (d.usesMedication === true) return true;
  if (d.medicationDetail?.trim()) return true;
  if (d.hasInjuries === true) return true;
  if (Array.isArray(d.injuries) && d.injuries.length > 0) return true;

  if (d.parqChestPain || d.parqFainted || d.parqBoneJoint || d.parqDoctorLimit || d.parqOther) return true;

  if (d.activityLevel) return true;
  if (d.previousMartialArts === true) return true;
  if (d.previousModality?.trim()) return true;
  if (d.previousPracticeTime?.trim()) return true;

  if (typeof d.heartRateRest === "number" && d.heartRateRest > 0) return true;
  if (d.bloodPressure?.trim()) return true;
  if (d.saturationO2?.trim()) return true;

  if (Array.isArray(d.mobilityLimitations) && d.mobilityLimitations.length > 0) return true;
  if (d.mobilityNotes?.trim()) return true;
  if (Array.isArray(d.posturalAssessment) && d.posturalAssessment.length > 0) return true;
  if (d.posturalNotes?.trim()) return true;

  if (typeof d.pushups1min === "number" && d.pushups1min > 0) return true;
  if (typeof d.situps1min === "number" && d.situps1min > 0) return true;
  if (typeof d.plankSeconds === "number" && d.plankSeconds > 0) return true;
  if (typeof d.squats1min === "number" && d.squats1min > 0) return true;
  if (d.runTest?.trim()) return true;

  if (typeof d.scoreCondition === "number" && d.scoreCondition > 0) return true;
  if (typeof d.scoreMobility === "number" && d.scoreMobility > 0) return true;
  if (typeof d.scoreCoordination === "number" && d.scoreCoordination > 0) return true;
  if (typeof d.scoreEndurance === "number" && d.scoreEndurance > 0) return true;
  if (typeof d.scoreStrength === "number" && d.scoreStrength > 0) return true;
  if (d.instructorNotes?.trim()) return true;

  if (d.signatureDate?.trim()) return true;
  if (d.shoeSizeBr?.trim()) return true;

  return false;
}
