import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { calendarDateLisbon, minutesSinceMidnightLisbon } from "@/lib/lesson-check-in-window";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { rpePromptHref, selectPostClassPrompts, type PromptAttendance, type PromptLesson } from "@/lib/post-class-rpe";

/**
 * Cron: «Como foi o treino?» ~30 min depois de cada aula, a quem esteve presente e ainda não deu
 * a nota de esforço. Notificação in-app (sino) + Web Push para quem o activou.
 * Correr a cada 15 min, com header Authorization: Bearer <CRON_SECRET>.
 *
 * GET /api/cron/post-class-rpe
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const today = calendarDateLisbon(now);
  const nowMin = minutesSinceMidnightLisbon(now);

  const { data: attRows, error: attErr } = await supabase
    .from("Attendance")
    .select("id, studentId, lessonId, rpe, rpeSource")
    .eq("occurrenceDate", today)
    .eq("status", "CONFIRMED")
    .eq("isExperimental", false);
  if (attErr) return NextResponse.json({ error: attErr.message }, { status: 500 });
  const attendances = (attRows ?? []) as PromptAttendance[];
  if (attendances.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const lessonIds = [...new Set(attendances.map((a) => a.lessonId))];
  const { data: lessonRows } = await supabase.from("Lesson").select("id, modality, startTime, endTime").in("id", lessonIds);
  const lessonsById = new Map(((lessonRows ?? []) as PromptLesson[]).map((l) => [l.id, l]));

  // Lembretes já enviados hoje (o href identifica a presença).
  const { data: sentRows } = await supabase
    .from("Notification")
    .select("href")
    .eq("type", "RPE_PROMPT")
    .gte("created_at", `${today}T00:00:00Z`);
  const alreadyPrompted = new Set(
    ((sentRows ?? []) as { href: string | null }[])
      .map((r) => /[?&]rpe=([^&]+)/.exec(r.href ?? "")?.[1])
      .filter((id): id is string => Boolean(id))
      .map((id) => decodeURIComponent(id))
  );

  const prompts = selectPostClassPrompts(attendances, lessonsById, alreadyPrompted, nowMin);
  const { data: rule } = await supabase.from("XpRule").select("xp").eq("source", "EFFORT_RATING").maybeSingle();
  const xp = (rule as { xp?: number } | null)?.xp ?? 0;

  for (const { attendance, lesson } of prompts) {
    const modality = MODALITY_LABELS[lesson.modality] ?? lesson.modality;
    await createInAppNotification(supabase, {
      studentId: attendance.studentId,
      type: "RPE_PROMPT",
      title: "Como foi o treino?",
      body: `${modality} ${(lesson.startTime ?? "").slice(0, 5)} · dá a tua nota de esforço${xp > 0 ? ` (+${xp} XP)` : ""}`,
      href: rpePromptHref(attendance.id),
    });
  }

  return NextResponse.json({ ok: true, candidates: attendances.length, sent: prompts.length });
}
