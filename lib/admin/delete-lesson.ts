import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { revalidatePublicWeeklySchedule } from "@/lib/public-weekly-schedule";
import { turmasPathAfterDelete } from "@/lib/turmas-list-query";

function getSupabaseForAdminWrite() {
  const adminResult = getAdminClientOrNull();
  return adminResult.client;
}

function revalidatePathsAfterLessonDelete() {
  revalidatePath("/admin/turmas");
  revalidatePath("/admin/presenca");
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  revalidatePath("/aula-experimental");
  revalidatePublicWeeklySchedule();
}

export type DeleteLessonResult = {
  error?: string;
  success?: boolean;
  deletedCount?: number;
  redirectTo?: string;
};

async function detachTrialClassesFromLessons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonIds: string[]
): Promise<{ error?: string }> {
  if (lessonIds.length === 0) return {};
  const { error } = await supabase.from("TrialClass").update({ lessonId: null }).in("lessonId", lessonIds);
  if (error) {
    console.error("detachTrialClassesFromLessons:", error);
    return { error: error.message };
  }
  return {};
}

/** Elimina a definição da aula (linha em `Lesson`). */
export async function performDeleteLessonDefinition(
  lessonId: string,
  returnQuery?: string
): Promise<DeleteLessonResult> {
  if (!lessonId?.trim()) {
    return { error: "ID da aula inválido." };
  }

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());
  const id = lessonId.trim();

  const detach = await detachTrialClassesFromLessons(supabase, [id]);
  if (detach.error) return { error: detach.error };

  const { error: delErr } = await supabase.from("Lesson").delete().eq("id", id);

  if (delErr) {
    console.error("performDeleteLessonDefinition:", delErr);
    return { error: delErr.message };
  }

  revalidatePathsAfterLessonDelete();
  revalidatePath("/dashboard");
  return {
    success: true,
    deletedCount: 1,
    redirectTo: turmasPathAfterDelete(returnQuery),
  };
}

/** Cancela só a ocorrência de uma semana (recorrente). */
export async function performCancelOccurrence(
  lessonId: string,
  occurrenceYmd: string,
  returnQuery?: string
): Promise<DeleteLessonResult> {
  if (!lessonId?.trim()) return { error: "ID da aula inválido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceYmd)) return { error: "Data inválida." };

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());

  const { data: row, error: fetchErr } = await supabase
    .from("Lesson")
    .select("isOneOff")
    .eq("id", lessonId.trim())
    .maybeSingle();

  if (fetchErr || !row) return { error: fetchErr?.message ?? "Aula não encontrada." };
  if ((row as { isOneOff?: boolean }).isOneOff) {
    return { error: "Aula única: usa eliminar a aula em vez de cancelar só uma semana." };
  }

  const { error } = await supabase.from("LessonCancellation").insert({
    id: crypto.randomUUID(),
    lessonId: lessonId.trim(),
    date: occurrenceYmd,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Esta semana já estava cancelada." };
    }
    console.error("performCancelOccurrence:", error);
    return { error: error.message };
  }

  revalidatePathsAfterLessonDelete();
  revalidatePath("/dashboard");
  return {
    success: true,
    deletedCount: 0,
    redirectTo: turmasPathAfterDelete(returnQuery),
  };
}

/** Compat: apagar definição (nome antigo). */
export async function performDeleteLesson(lessonId: string, returnQuery?: string): Promise<DeleteLessonResult> {
  return performDeleteLessonDefinition(lessonId, returnQuery);
}
