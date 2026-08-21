"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { BENCHMARK_PRESETS } from "@/lib/benchmark-presets";

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type RpeFormState = { error?: string } | null;

export async function submitRpeAction(_prev: RpeFormState, formData: FormData): Promise<RpeFormState> {
  const attendanceId = String(formData.get("attendanceId") ?? "").trim();
  const rpe = Number(formData.get("rpe"));
  const rawWeight = formData.get("postWeightKg");
  const postWeightKg =
    rawWeight === "" || rawWeight == null ? null : Number(rawWeight);
  if (!attendanceId || !Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
    return { error: "RPE inválido (1–10)." };
  }
  if (postWeightKg != null && (!Number.isFinite(postWeightKg) || postWeightKg < 30 || postWeightKg > 250)) {
    return { error: "Peso pós-treino inválido (30–250 kg)." };
  }
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("Attendance")
    .select("id, studentId, status")
    .eq("id", attendanceId)
    .maybeSingle();
  if (!row || (row as { studentId: string }).studentId !== studentId) {
    return { error: "Presença não encontrada." };
  }
  if ((row as { status: string }).status !== "CONFIRMED") {
    return { error: "Só podes registar RPE após presença confirmada." };
  }

  const nowIso = new Date().toISOString();
  const updatePayload: {
    rpe: number;
    rpeRecordedAt: string;
    postWeightKg?: number;
    postWeightRecordedAt?: string;
  } = { rpe, rpeRecordedAt: nowIso };

  if (postWeightKg != null) {
    updatePayload.postWeightKg = postWeightKg;
    updatePayload.postWeightRecordedAt = nowIso;
    const { error: wErr } = await supabase.from("BodyWeightEntry").insert({
      id: crypto.randomUUID(),
      studentId,
      weightKg: postWeightKg,
      notes: "Pós-treino",
      recordedAt: ymdDaysAgo(0),
    });
    if (wErr) return { error: wErr.message };
    await supabase
      .from("StudentProfile")
      .update({ weightKg: postWeightKg, updatedAt: nowIso })
      .eq("studentId", studentId);
  }

  const { error } = await supabase.from("Attendance").update(updatePayload).eq("id", attendanceId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bem-estar");
  revalidatePath("/dashboard/bem-estar/rpe");
  revalidatePath("/dashboard/bem-estar/peso");
  return {};
}

export type SimpleFormState = { error?: string } | null;

export async function submitPainAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida." };

  const bodyRegion = String(formData.get("bodyRegion") ?? "").trim();
  const intensity = Number(formData.get("intensity"));
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);

  if (!bodyRegion) return { error: "Escolhe uma zona." };
  if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
    return { error: "Intensidade inválida (1–10)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("PainSelfReport").insert({
    id: crypto.randomUUID(),
    studentId,
    bodyRegion,
    intensity,
    notes: notes || null,
    reportedAt: ymdDaysAgo(0),
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/bem-estar/dores");
  return {};
}

export async function submitBenchmarkAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida." };

  const benchmarkKey = String(formData.get("benchmarkKey") ?? "").trim();
  const value = Number(formData.get("value"));
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300);

  const preset = BENCHMARK_PRESETS.find((p) => p.key === benchmarkKey);
  if (!preset) return { error: "Tipo de teste inválido." };
  if (!Number.isFinite(value) || value <= 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const unit = preset.unit;

  const { error } = await supabase.from("PhysicalBenchmarkEntry").insert({
    id: crypto.randomUUID(),
    studentId,
    benchmarkKey,
    value,
    unit,
    notes: notes || null,
    recordedAt: ymdDaysAgo(0),
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/bem-estar/benchmarks");
  return {};
}

export async function submitBodyWeightAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida." };

  const weightKg = Number(formData.get("weightKg"));
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300);

  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 250) {
    return { error: "Peso inválido." };
  }

  const supabase = await createClient();
  const { error: insErr } = await supabase.from("BodyWeightEntry").insert({
    id: crypto.randomUUID(),
    studentId,
    weightKg,
    notes: notes || null,
    recordedAt: ymdDaysAgo(0),
  });
  if (insErr) return { error: insErr.message };

  await supabase
    .from("StudentProfile")
    .update({ weightKg, updatedAt: new Date().toISOString() })
    .eq("studentId", studentId);

  revalidatePath("/dashboard/bem-estar/peso");
  revalidatePath("/dashboard");
  return {};
}

export async function updateWeightGoalsAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida." };

  const rawGoal = formData.get("weightGoalKg");
  const rawDate = formData.get("weightGoalTargetDate");
  const weightGoalKg =
    rawGoal === "" || rawGoal == null ? null : Number(rawGoal);
  const weightGoalTargetDate =
    typeof rawDate === "string" && rawDate.length >= 10 ? rawDate.slice(0, 10) : null;

  if (weightGoalKg != null && (!Number.isFinite(weightGoalKg) || weightGoalKg < 30 || weightGoalKg > 250)) {
    return { error: "Meta de peso inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("StudentProfile")
    .update({
      weightGoalKg,
      weightGoalTargetDate,
      updatedAt: new Date().toISOString(),
    })
    .eq("studentId", studentId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bem-estar/peso");
  return {};
}
