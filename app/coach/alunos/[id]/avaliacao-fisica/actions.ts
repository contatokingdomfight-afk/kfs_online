"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { revalidatePath } from "next/cache";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

const MONTHS_UNTIL_NEXT = 6;

export type SaveAssessmentResult = { error?: string; success?: boolean };

export async function savePhysicalAssessment(
  _prev: SaveAssessmentResult | null,
  formData: FormData
): Promise<SaveAssessmentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") return { error: "Sem permissão." };

  const coachId = await getCurrentCoachId();
  if (dbUser.role === "COACH" && !coachId) return { error: "Perfil de coach não encontrado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  if (!studentId) return { error: "Aluno não identificado." };

  const supabase = await createClient();

  const clearance = (formData.get("clearance") as string)?.trim();
  if (!clearance || !["APTO", "APTO_RESTRICOES", "NECESSITA_AVALIACAO_MEDICA"].includes(clearance)) {
    return { error: "Seleciona uma liberação (Apto / Apto com restrições / Necessita avaliação médica)." };
  }

  const assessedAtStr = (formData.get("assessedAt") as string)?.trim();
  const assessedAt = assessedAtStr ? new Date(assessedAtStr) : new Date();
  if (Number.isNaN(assessedAt.getTime())) return { error: "Data da avaliação inválida." };

  const nextDue = new Date(assessedAt);
  nextDue.setMonth(nextDue.getMonth() + MONTHS_UNTIL_NEXT);

  const formDataJson: PhysicalAssessmentFormData = {
    objectives: formData.getAll("objectives") as string[],
    objectiveOther: (formData.get("objectiveOther") as string)?.trim() || undefined,
    medicalConditions: formData.getAll("medicalConditions") as string[],
    medicalConditionsOther: (formData.get("medicalConditionsOther") as string)?.trim() || undefined,
    usesMedication: formData.get("usesMedication") === "true",
    medicationDetail: (formData.get("medicationDetail") as string)?.trim() || undefined,
    hasInjuries: formData.get("hasInjuries") === "true",
    parqChestPain: formData.get("parqChestPain") === "true",
    parqFainted: formData.get("parqFainted") === "true",
    parqBoneJoint: formData.get("parqBoneJoint") === "true",
    parqDoctorLimit: formData.get("parqDoctorLimit") === "true",
    parqOther: formData.get("parqOther") === "true",
    activityLevel: (formData.get("activityLevel") as PhysicalAssessmentFormData["activityLevel"]) || undefined,
    previousMartialArts: formData.get("previousMartialArts") === "true",
    previousModality: (formData.get("previousModality") as string)?.trim() || undefined,
    previousPracticeTime: (formData.get("previousPracticeTime") as string)?.trim() || undefined,
    heartRateRest: parseInt(String(formData.get("heartRateRest")), 10) || null,
    bloodPressure: (formData.get("bloodPressure") as string)?.trim() || null,
    saturationO2: (formData.get("saturationO2") as string)?.trim() || null,
    mobilityLimitations: formData.getAll("mobilityLimitations") as string[],
    mobilityNotes: (formData.get("mobilityNotes") as string)?.trim() || undefined,
    posturalAssessment: formData.getAll("posturalAssessment") as string[],
    posturalNotes: (formData.get("posturalNotes") as string)?.trim() || undefined,
    pushups1min: parseInt(String(formData.get("pushups1min")), 10) || null,
    situps1min: parseInt(String(formData.get("situps1min")), 10) || null,
    plankSeconds: parseInt(String(formData.get("plankSeconds")), 10) || null,
    squats1min: parseInt(String(formData.get("squats1min")), 10) || null,
    runTest: (formData.get("runTest") as string)?.trim() || null,
    scoreCondition: parseInt(String(formData.get("scoreCondition")), 10) || null,
    scoreMobility: parseInt(String(formData.get("scoreMobility")), 10) || null,
    scoreCoordination: parseInt(String(formData.get("scoreCoordination")), 10) || null,
    scoreEndurance: parseInt(String(formData.get("scoreEndurance")), 10) || null,
    scoreStrength: parseInt(String(formData.get("scoreStrength")), 10) || null,
    instructorNotes: (formData.get("instructorNotes") as string)?.trim() || undefined,
    signatureDate: (formData.get("signatureDate") as string)?.trim() || undefined,
  };

  let finalCoachId = coachId ?? null;
  if (!finalCoachId && dbUser.role === "ADMIN") {
    const { data: first } = await supabase.from("Coach").select("id").limit(1).single();
    finalCoachId = first?.id ?? null;
  }
  if (!finalCoachId) return { error: "Nenhum coach encontrado para associar à avaliação." };

  const { error } = await supabase.from("StudentPhysicalAssessment").insert({
    studentId,
    coachId: finalCoachId,
    assessedAt: assessedAt.toISOString().slice(0, 10),
    nextDueAt: nextDue.toISOString().slice(0, 10),
    clearance,
    formData: formDataJson,
  });

  if (error) {
    console.error("savePhysicalAssessment:", error);
    return { error: error.message };
  }

  revalidatePath(`/coach/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}/avaliacao-fisica`);
  return { success: true };
}
