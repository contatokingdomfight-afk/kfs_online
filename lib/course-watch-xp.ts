import { createAdminClient } from "@/lib/supabase/admin";
import { syncAthleteDisplayBelt } from "@/lib/sync-athlete-display-belt";

/** XP por aula (unidade ou módulo legado) assistida/concluída na biblioteca. */
export const XP_PER_LESSON_WATCHED = 5;
/** XP extra quando o aluno conclui 100% das aulas de um curso (uma única vez). */
export const XP_PER_COURSE_COMPLETED = 20;

/**
 * Usa sempre o cliente admin (service role): concessão de XP é uma operação
 * de sistema, não uma escrita do próprio aluno — o cliente ligado à sessão
 * do aluno (RLS) não tem permissão para editar Athlete.xp directamente.
 */
async function getOrCreateAthleteId(studentId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();
  if (existing?.id) return existing.id;

  const id = crypto.randomUUID();
  const { error } = await supabase.from("Athlete").insert({ id, studentId });
  if (error) {
    console.error("getOrCreateAthleteId insert:", error);
    return null;
  }
  return id;
}

async function awardXp(studentId: string, amount: number): Promise<void> {
  const athleteId = await getOrCreateAthleteId(studentId);
  if (!athleteId) return;

  const supabase = createAdminClient();
  const { data: athlete } = await supabase.from("Athlete").select("xp").eq("id", athleteId).single();
  const currentXp = (athlete?.xp as number | null) ?? 0;
  await supabase.from("Athlete").update({ xp: currentXp + amount }).eq("id", athleteId);
  // A promoção de faixa continua automática — este XP só entra na mesma conta.
  await syncAthleteDisplayBelt(supabase, athleteId);
}

/** Verifica se o aluno já completou todas as aulas do curso e, em caso afirmativo, concede o bónus (uma vez). */
async function maybeAwardCourseCompletionBonus(studentId: string, courseId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: existingCompletion } = await supabase
    .from("CourseCompletion")
    .select("id")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existingCompletion) return;

  const { data: modulesData } = await supabase
    .from("CourseModule")
    .select("id, video_url")
    .eq("course_id", courseId)
    .eq("status", "PUBLISHED");
  const moduleList = modulesData ?? [];
  const moduleIds = moduleList.map((m) => m.id);

  let units: { id: string; module_id: string }[] = [];
  if (moduleIds.length > 0) {
    const { data } = await supabase
      .from("CourseUnit")
      .select("id, module_id")
      .in("module_id", moduleIds)
      .eq("status", "PUBLISHED");
    units = data ?? [];
  }

  const unitCountByModule = new Map<string, number>();
  for (const u of units) {
    unitCountByModule.set(u.module_id, (unitCountByModule.get(u.module_id) ?? 0) + 1);
  }
  // Módulos "legado": vídeo direto no módulo, sem unidades — contam como uma aula.
  const legacyModules = moduleList.filter((m) => (unitCountByModule.get(m.id) ?? 0) === 0 && m.video_url);
  const totalItems = units.length + legacyModules.length;
  if (totalItems === 0) return;

  const unitIds = units.map((u) => u.id);
  const legacyModuleIds = legacyModules.map((m) => m.id);
  const [unitProgressResult, legacyProgressResult] = await Promise.all([
    unitIds.length > 0
      ? supabase.from("CourseUnitProgress").select("id", { count: "exact", head: true }).eq("student_id", studentId).in("unit_id", unitIds)
      : Promise.resolve({ count: 0 }),
    legacyModuleIds.length > 0
      ? supabase.from("CourseProgress").select("id", { count: "exact", head: true }).eq("student_id", studentId).in("module_id", legacyModuleIds)
      : Promise.resolve({ count: 0 }),
  ]);

  const completedTotal = (unitProgressResult.count ?? 0) + (legacyProgressResult.count ?? 0);
  if (completedTotal < totalItems) return;

  const { error: insertErr } = await supabase.from("CourseCompletion").insert({
    id: crypto.randomUUID(),
    student_id: studentId,
    course_id: courseId,
  });
  // Conflito de unicidade (corrida entre pedidos) — outro já concedeu o bónus, não duplica.
  if (insertErr) return;

  await awardXp(studentId, XP_PER_COURSE_COMPLETED);
}

/** Chamar depois de registar a conclusão de uma aula (unidade ou módulo legado) pela primeira vez. */
export async function awardLessonWatchedXp(studentId: string, courseId: string): Promise<void> {
  await awardXp(studentId, XP_PER_LESSON_WATCHED);
  await maybeAwardCourseCompletionBonus(studentId, courseId);
}
