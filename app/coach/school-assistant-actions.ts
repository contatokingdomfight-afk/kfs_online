"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { coachTeachesAtSchool } from "@/lib/coach-schools";

async function assertCanManageAssistantForStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string
): Promise<{ ok: true; student: { schoolId: string; userId: string; status: string } } | { ok: false; error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { ok: false, error: "Sessão inválida." };

  const { data: student } = await supabase
    .from("Student")
    .select("id, schoolId, userId, status")
    .eq("id", studentId)
    .single();
  if (!student?.schoolId || !student.userId) return { ok: false, error: "Aluno não encontrado." };

  if (dbUser.role === "ADMIN") return { ok: true, student };

  if (dbUser.role !== "COACH") return { ok: false, error: "Sem permissão." };

  const coachId = await getCurrentCoachId();
  if (!coachId) return { ok: false, error: "Perfil de coach não encontrado." };

  const teaches = await coachTeachesAtSchool(supabase, coachId, student.schoolId);
  if (!teaches) return { ok: false, error: "Só podes gerir assistentes de alunos da tua escola." };

  return { ok: true, student };
}

/** Promove aluno a treinador assistente na escola do aluno (COACH da escola ou ADMIN). */
export async function promoteSchoolAssistantCoach(studentId: string): Promise<{ error?: string; success?: boolean }> {
  const trimmed = studentId?.trim();
  if (!trimmed) return { error: "Aluno em falta." };

  const supabase = await createClient();
  const gate = await assertCanManageAssistantForStudent(supabase, trimmed);
  if (!gate.ok) return { error: gate.error };

  const { data: targetUser } = await supabase.from("User").select("id, role").eq("id", gate.student.userId).single();
  if (!targetUser) return { error: "Utilizador do aluno não encontrado." };
  if (targetUser.role !== "ALUNO") return { error: "Só alunos podem ser assistentes." };
  if (gate.student.status === "INATIVO") return { error: "Aluno inativo não pode ser assistente." };

  const admin = getAdminClientOrNull();
  const db = admin.client ?? supabase;

  const { data: existing } = await db.from("SchoolAssistantCoach").select("id").eq("studentId", trimmed).maybeSingle();
  const dbUser = await getCurrentDbUser();
  const grantedBy = dbUser?.id ?? null;

  if (existing?.id) {
    const { error } = await db
      .from("SchoolAssistantCoach")
      .update({
        schoolId: gate.student.schoolId,
        revokedAt: null,
        grantedByUserId: grantedBy,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await db.from("SchoolAssistantCoach").insert({
      schoolId: gate.student.schoolId,
      studentId: trimmed,
      grantedByUserId: grantedBy,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/coach/alunos/${trimmed}`);
  revalidatePath(`/admin/alunos/${trimmed}`);
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  return { success: true };
}

/** Revoga o papel de treinador assistente. */
export async function revokeSchoolAssistantCoach(studentId: string): Promise<{ error?: string; success?: boolean }> {
  const trimmed = studentId?.trim();
  if (!trimmed) return { error: "Aluno em falta." };

  const supabase = await createClient();
  const gate = await assertCanManageAssistantForStudent(supabase, trimmed);
  if (!gate.ok) return { error: gate.error };

  const admin = getAdminClientOrNull();
  const db = admin.client ?? supabase;

  const { error } = await db
    .from("SchoolAssistantCoach")
    .update({ revokedAt: new Date().toISOString() })
    .eq("studentId", trimmed)
    .is("revokedAt", null);

  if (error) return { error: error.message };

  revalidatePath(`/coach/alunos/${trimmed}`);
  revalidatePath(`/admin/alunos/${trimmed}`);
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  return { success: true };
}
