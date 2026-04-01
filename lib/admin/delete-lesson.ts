import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { turmasPathAfterDelete } from "@/lib/turmas-list-query";
import { listFutureSeriesLessonIds } from "@/lib/admin/recurring-lesson-series";

function getSupabaseForAdminWrite() {
  const adminResult = getAdminClientOrNull();
  return adminResult.client;
}

function revalidatePathsAfterLessonDelete() {
  revalidatePath("/admin/turmas");
  revalidatePath("/admin/presenca");
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
}

export type DeleteLessonResult = {
  error?: string;
  success?: boolean;
  deletedCount?: number;
  /** URL interna para o cliente após sucesso */
  redirectTo?: string;
};

/** `TrialClass.lessonId` referencia `Lesson` sem ON DELETE SET NULL — é preciso libertar antes do DELETE. */
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

/**
 * Remove a aula âncora e todas as futuras da mesma série semanal (recorrente),
 * ou apenas uma aula única (`isOneOff`).
 */
export async function performDeleteLesson(
  lessonId: string,
  returnQuery?: string
): Promise<DeleteLessonResult> {
  if (!lessonId?.trim()) {
    return { error: "ID da aula inválido." };
  }

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());
  const id = lessonId.trim();

  const { ids, error: listErr, isOneOff } = await listFutureSeriesLessonIds(supabase, id);
  if (listErr) {
    return { error: listErr };
  }
  if (ids.length === 0) {
    return { error: isOneOff ? "Aula não encontrada." : "Nenhuma aula em série encontrada para remover." };
  }

  const detach = await detachTrialClassesFromLessons(supabase, ids);
  if (detach.error) return { error: detach.error };

  const { error: delErr } = await supabase.from("Lesson").delete().in("id", ids);

  if (delErr) {
    console.error("performDeleteLesson:", delErr);
    return { error: delErr.message };
  }

  revalidatePathsAfterLessonDelete();
  return {
    success: true,
    deletedCount: ids.length,
    redirectTo: turmasPathAfterDelete(returnQuery),
  };
}
