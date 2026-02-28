import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLessonReminder } from "@/lib/notifications/email";

/**
 * Cron: envia lembretes por email para as aulas do dia seguinte.
 * Chamar diariamente (ex.: Vercel Cron ou cron-job.org) com header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * GET /api/cron/lesson-reminders
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const authorized = isVercelCron || (secret && authHeader === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .eq("date", tomorrowStr)
    .order("startTime", { ascending: true });

  if (!lessons?.length) {
    return NextResponse.json({ ok: true, message: "Nenhuma aula amanhã", sent: 0 });
  }

  const lessonInfos = lessons.map((l) => ({
    modality: l.modality,
    date: l.date,
    startTime: l.startTime,
    endTime: l.endTime,
  }));

  const { data: students } = await supabase
    .from("Student")
    .select("id, userId, planId")
    .eq("status", "ATIVO");

  if (!students?.length) {
    return NextResponse.json({ ok: true, sent: 0, lessons: lessons.length });
  }

  const planIds = [...new Set(students.map((s) => s.planId).filter(Boolean))] as string[];
  const { data: plans } = await supabase
    .from("Plan")
    .select("id")
    .in("id", planIds)
    .eq("is_active", true);
  const activePlanIds = new Set((plans ?? []).map((p) => p.id));

  const studentsWithPlan = students.filter((s) => s.planId && activePlanIds.has(s.planId));
  const userIds = [...new Set(studentsWithPlan.map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, email, name").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  let sent = 0;
  for (const student of studentsWithPlan) {
    const user = userById.get(student.userId);
    if (!user?.email) continue;
    const err = await sendLessonReminder(user.email, user.name ?? null, lessonInfos);
    if (!err.error) sent++;
  }

  return NextResponse.json({ ok: true, sent, lessons: lessons.length });
}
