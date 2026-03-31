import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { turmasPathAfterDelete } from "@/lib/turmas-list-query";

function getSupabaseForAdminWrite() {
  const adminResult = getAdminClientOrNull();
  return adminResult.client;
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function utcDateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Segunda=1 … Domingo=7 (alinhado a `createLesson` / dia da semana da recorrência). */
function weekdayFromYmd(ymd: string): number | null {
  const p = parseYmd(ymd);
  if (!p) return null;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

function lessonDateYmd(date: unknown): string {
  if (typeof date === "string") return date.slice(0, 10);
  if (date instanceof Date) return utcDateToYmd(date);
  return String(date).slice(0, 10);
}

function revalidatePathsAfterLessonDelete() {
  revalidatePath("/admin/turmas");
  revalidatePath("/admin/presenca");
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
}

export type DeleteLessonScope = "single" | "series_future";

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
 * Remove uma aula ou todas as instâncias futuras da mesma série recorrente.
 * Chamador deve garantir que o utilizador é ADMIN.
 */
export async function performDeleteLesson(
  lessonId: string,
  scope: DeleteLessonScope = "single",
  returnQuery?: string
): Promise<DeleteLessonResult> {
  if (!lessonId?.trim()) {
    return { error: "ID da aula inválido." };
  }

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());
  const id = lessonId.trim();

  if (scope === "single") {
    const detach = await detachTrialClassesFromLessons(supabase, [id]);
    if (detach.error) return { error: detach.error };

    const { error } = await supabase.from("Lesson").delete().eq("id", id);
    if (error) {
      console.error("performDeleteLesson error:", error);
      return { error: error.message };
    }
    revalidatePathsAfterLessonDelete();
    return {
      success: true,
      deletedCount: 1,
      redirectTo: turmasPathAfterDelete(returnQuery),
    };
  }

  const { data: anchor, error: fetchErr } = await supabase
    .from("Lesson")
    .select("id, date, schoolId, coachId, modality, startTime, endTime, isOneOff, isOpenClass")
    .eq("id", id)
    .single();

  if (fetchErr || !anchor) {
    return { error: fetchErr?.message ?? "Aula não encontrada." };
  }

  if ((anchor as { isOneOff?: boolean }).isOneOff) {
    return { error: "Esta é uma aula única; só pode ser removida individualmente." };
  }

  const anchorYmd = lessonDateYmd((anchor as { date: unknown }).date);
  const anchorWd = weekdayFromYmd(anchorYmd);
  if (anchorWd == null) {
    return { error: "Data da aula inválida." };
  }

  const { data: candidates, error: listErr } = await supabase
    .from("Lesson")
    .select("id, date")
    .eq("schoolId", (anchor as { schoolId: string }).schoolId)
    .eq("coachId", (anchor as { coachId: string }).coachId)
    .eq("modality", (anchor as { modality: string }).modality)
    .eq("startTime", (anchor as { startTime: string }).startTime)
    .eq("endTime", (anchor as { endTime: string }).endTime)
    .eq("isOneOff", false)
    .eq("isOpenClass", Boolean((anchor as { isOpenClass?: boolean }).isOpenClass))
    .gte("date", anchorYmd);

  if (listErr) {
    console.error("performDeleteLesson list:", listErr);
    return { error: listErr.message };
  }

  const ids = (candidates ?? [])
    .filter((row) => weekdayFromYmd(lessonDateYmd(row.date)) === anchorWd)
    .map((row) => row.id);

  if (ids.length === 0) {
    return { error: "Nenhuma aula em série encontrada para remover." };
  }

  const detach = await detachTrialClassesFromLessons(supabase, ids);
  if (detach.error) return { error: detach.error };

  const { error: delErr } = await supabase.from("Lesson").delete().in("id", ids);

  if (delErr) {
    console.error("performDeleteLesson series:", delErr);
    return { error: delErr.message };
  }

  revalidatePathsAfterLessonDelete();
  return {
    success: true,
    deletedCount: ids.length,
    redirectTo: turmasPathAfterDelete(returnQuery),
  };
}
