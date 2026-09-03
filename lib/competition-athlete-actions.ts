"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { coachTeachesAtSchool } from "@/lib/coach-schools";

async function assertCanManageCompetitionFlagForStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string
): Promise<{ ok: true; schoolId: string } | { ok: false; error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { ok: false, error: "Sessão inválida." };

  /** RLS em `Student` só permite SELECT ao próprio aluno; coach/admin precisam de leitura via service role. */
  const adminRead = getAdminClientOrNull().client;
  if (!adminRead) {
    return {
      ok: false,
      error: "Configuração em falta no servidor (SUPABASE_SERVICE_ROLE_KEY). Não foi possível validar o aluno.",
    };
  }

  const { data: student } = await adminRead.from("Student").select("id, schoolId").eq("id", studentId).maybeSingle();
  if (!student?.schoolId) return { ok: false, error: "Aluno não encontrado." };

  if (dbUser.role === "ADMIN") return { ok: true, schoolId: student.schoolId };
  if (dbUser.role !== "COACH") return { ok: false, error: "Sem permissão." };

  const coachId = await getCurrentCoachId();
  if (!coachId) return { ok: false, error: "Perfil de coach não encontrado." };

  const teaches = await coachTeachesAtSchool(supabase, coachId, student.schoolId);
  if (!teaches) return { ok: false, error: "Só podes gerir esta flag para alunos da tua escola." };

  return { ok: true, schoolId: student.schoolId };
}

/** Marca/desmarca um aluno como "atleta de competição" (quer competir). Admin, ou coach da escola do aluno. */
export async function setCompetitionAthlete(
  studentId: string,
  value: boolean
): Promise<{ error?: string; success?: boolean }> {
  const trimmed = studentId?.trim();
  if (!trimmed) return { error: "Aluno em falta." };

  const supabase = await createClient();
  const gate = await assertCanManageCompetitionFlagForStudent(supabase, trimmed);
  if (!gate.ok) return { error: gate.error };

  const admin = getAdminClientOrNull();
  const db = admin.client ?? supabase;

  const { error } = await db.from("Student").update({ competitionAthlete: value }).eq("id", trimmed);
  if (error) return { error: error.message };

  revalidatePath(`/coach/alunos/${trimmed}`);
  revalidatePath(`/admin/alunos/${trimmed}`);
  revalidatePath("/admin/turmas");
  revalidatePath("/coach/agenda");
  return { success: true };
}
