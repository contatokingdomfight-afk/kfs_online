import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReengagementEmail } from "@/lib/notifications/email";
import { notifyStudentOfInactivity } from "@/lib/notifications/in-app";

/** Dias sem check-in confirmado para considerar o aluno inativo (ajustável via env). */
const INACTIVE_DAYS = Number(process.env.REENGAGEMENT_INACTIVE_DAYS ?? 7);
/** Não repetir o aviso a cada corrida do cron — só reenviar depois de silenciar por este período. */
const SILENCE_DAYS = INACTIVE_DAYS;

/**
 * Cron: avisa alunos ativos (com plano ativo) que não têm check-in confirmado
 * há INACTIVE_DAYS dias e ainda não receberam este aviso nos últimos SILENCE_DAYS dias.
 * Só considera quem já teve pelo menos uma presença confirmada (não incomoda quem nunca começou).
 * Chamar diariamente (ex.: Vercel Cron ou cron-job.org) com header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * GET /api/cron/reengagement-check
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const now = Date.now();
  const inactiveSinceIso = new Date(now - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const silenceSinceIso = new Date(now - SILENCE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: students } = await supabase
    .from("Student")
    .select("id, userId, planId")
    .eq("status", "ATIVO");

  if (!students?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const planIds = [...new Set(students.map((s) => s.planId).filter(Boolean))] as string[];
  const { data: plans } = await supabase.from("Plan").select("id").in("id", planIds).eq("isActive", true);
  const activePlanIds = new Set((plans ?? []).map((p) => p.id));
  const studentsWithPlan = students.filter((s) => s.planId && activePlanIds.has(s.planId));

  if (studentsWithPlan.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const studentIds = studentsWithPlan.map((s) => s.id);

  /** Última presença confirmada de cada aluno (a mais recente primeiro; guarda só a 1.ª ocorrência). */
  const { data: attendances } = await supabase
    .from("Attendance")
    .select("studentId, checkedInAt")
    .in("studentId", studentIds)
    .not("checkedInAt", "is", null)
    .order("checkedInAt", { ascending: false });

  const lastCheckInByStudent = new Map<string, string>();
  for (const row of attendances ?? []) {
    const sid = row.studentId as string;
    if (!lastCheckInByStudent.has(sid)) lastCheckInByStudent.set(sid, row.checkedInAt as string);
  }

  /** Só quem já treinou pelo menos uma vez e está inativo há INACTIVE_DAYS ou mais. */
  const candidateIds = studentIds.filter((sid) => {
    const last = lastCheckInByStudent.get(sid);
    return last != null && last <= inactiveSinceIso;
  });

  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, candidates: 0 });
  }

  /** Evita repetir o aviso: ignora quem já recebeu um REENGAGEMENT dentro da janela de silêncio. */
  const { data: recentNotifs } = await supabase
    .from("Notification")
    .select("studentId")
    .eq("type", "REENGAGEMENT")
    .in("studentId", candidateIds)
    .gte("created_at", silenceSinceIso);
  const alreadyNotified = new Set((recentNotifs ?? []).map((n) => n.studentId as string));

  const toNotify = candidateIds.filter((sid) => !alreadyNotified.has(sid));
  if (toNotify.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, candidates: candidateIds.length });
  }

  const studentById = new Map(studentsWithPlan.map((s) => [s.id, s]));
  const userIds = [...new Set(toNotify.map((sid) => studentById.get(sid)!.userId))];
  const { data: users } = await supabase.from("User").select("id, email, name").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  let sent = 0;
  const BATCH = 25;
  for (let i = 0; i < toNotify.length; i += BATCH) {
    const chunk = toNotify.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (studentId) => {
        const student = studentById.get(studentId)!;
        const user = userById.get(student.userId);
        await notifyStudentOfInactivity(supabase, studentId);
        if (user?.email) await sendReengagementEmail(user.email, user.name ?? null);
        sent++;
      })
    );
  }

  return NextResponse.json({ ok: true, sent, candidates: candidateIds.length });
}
