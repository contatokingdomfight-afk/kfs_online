"use server";

import { getSchoolScope, isNetworkScope, schoolAccessErrorForRows, schoolAccessErrorForStudent } from "@/lib/school-scope";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { buildKingdomTemplateDraft } from "@/lib/graduation/kingdom-muay-thai-template";
import { loadGraduationTemplate } from "@/lib/graduation/load-template";
import { normalizeTemplateDraft, type GraduationTemplateDraft } from "@/lib/graduation/template";

export type SaveGraduationTemplateResult = { error?: string; success?: boolean };
export type StarterDraftResult = { error?: string; draft?: GraduationTemplateDraft };

async function authorize(): Promise<{ userId: string } | { error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:sistema:write");
  if (permErr) return { error: permErr };
  return { userId: dbUser.id };
}

function friendlyDbError(message: string): string {
  if (message.includes("StudentGrade") || message.includes("GraduationExamCandidate")) {
    return "Não é possível remover um grau que já foi atribuído a alunos ou usado num exame.";
  }
  if (message.includes("graduation_template_foreign_ids")) {
    return "O template contém elementos de outra modalidade. Recarrega a página e tenta de novo.";
  }
  if (message.includes("GraduationGradeCourse_courseId_fkey")) {
    return "Um dos cursos escolhidos já não existe. Remove-o e guarda de novo.";
  }
  return "Não foi possível guardar o template. Tenta de novo.";
}

export async function saveGraduationTemplate(payload: unknown): Promise<SaveGraduationTemplateResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  if (!isNetworkScope(await getSchoolScope())) return { error: "Só o Admin Geral pode alterar o programa de graduação da rede." };

  const normalized = normalizeTemplateDraft(payload);
  if (!normalized.ok) return { error: normalized.error };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração Supabase em falta." };

  const { error } = await result.client.rpc("save_graduation_template", {
    p_payload: normalized.draft,
    p_user_id: auth.userId,
  });
  if (error) {
    console.error("saveGraduationTemplate:", error);
    return { error: friendlyDbError(`${error.message} ${error.details ?? ""}`) };
  }

  revalidatePath("/admin/graduacao");
  revalidatePath(`/admin/graduacao/${normalized.draft.modalityCode}`);
  return { success: true };
}

/**
 * Ponto de partida para uma modalidade sem template: modelo Kingdom (Muay Thai) ou cópia de outra
 * modalidade. Devolve um rascunho com ids novos — só fica gravado quando o admin guardar.
 */
export async function getGraduationStarterDraft(
  modalityCode: string,
  source: { kind: "kingdom" } | { kind: "copy"; fromModalityCode: string }
): Promise<StarterDraftResult> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  if (!isNetworkScope(await getSchoolScope())) return { error: "Só o Admin Geral pode alterar o programa de graduação da rede." };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração Supabase em falta." };

  const { data: modality } = await result.client.from("ModalityRef").select("name").eq("code", modalityCode).maybeSingle();
  if (!modality) return { error: "Modalidade não encontrada." };
  const name = `Graduação ${modality.name}`;

  if (source.kind === "kingdom") {
    return { draft: buildKingdomTemplateDraft(modalityCode, name, randomUUID) };
  }

  const from = await loadGraduationTemplate(result.client, source.fromModalityCode);
  if (!from) return { error: "A modalidade escolhida ainda não tem template." };
  return {
    draft: {
      ...from,
      modalityCode,
      name,
      isPublished: false,
      grades: from.grades.map((g) => ({
        ...g,
        id: randomUUID(),
        items: g.items.map((i) => ({ ...i, id: randomUUID() })),
        requirements: g.requirements.map((r) => ({ ...r, id: randomUUID() })),
        // Cursos costumam ser específicos da modalidade: não são copiados.
        courses: [],
      })),
    },
  };
}

/**
 * Graus iniciais (migração das faixas antigas): grava o grau escolhido para cada aluno como
 * StudentGrade de origem MIGRATION. "Sem graduação" apaga os registos de migração/manuais.
 * Alunos com grau obtido em exame não são alterados.
 */
export async function applyInitialGrades(
  modalityCode: string,
  changes: { studentId: string; gradeId: string | null }[]
): Promise<{ error?: string; applied?: number }> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração Supabase em falta." };
  const supabase = result.client;
  if (changes.length === 0) return { applied: 0 };
  { const schoolErr = await schoolAccessErrorForRows("Student", changes.map((c) => c.studentId)); if (schoolErr) return { error: schoolErr }; }
  if (changes.length > 1000) return { error: "Demasiadas alterações de uma vez." };

  const template = await loadGraduationTemplate(supabase, modalityCode);
  if (!template) return { error: "A modalidade não tem graduação configurada." };
  const validGrades = new Set(template.grades.map((g) => g.id));
  if (changes.some((c) => c.gradeId != null && !validGrades.has(c.gradeId))) return { error: "Grau inválido para esta modalidade." };

  const studentIds = [...new Set(changes.map((c) => c.studentId))];
  const { data: examGrades } = await supabase
    .from("StudentGrade")
    .select("studentId")
    .eq("modalityCode", modalityCode)
    .eq("source", "EXAM")
    .in("studentId", studentIds);
  const locked = new Set((examGrades ?? []).map((g) => g.studentId));
  const allowed = changes.filter((c) => !locked.has(c.studentId));

  const toClear = allowed.filter((c) => c.gradeId == null).map((c) => c.studentId);
  if (toClear.length) {
    const { error } = await supabase
      .from("StudentGrade")
      .delete()
      .eq("modalityCode", modalityCode)
      .in("source", ["MIGRATION", "MANUAL"])
      .in("studentId", toClear);
    if (error) {
      console.error("applyInitialGrades delete:", error);
      return { error: "Não foi possível remover graus." };
    }
  }

  const now = new Date().toISOString();
  const toInsert = allowed
    .filter((c) => c.gradeId != null)
    .map((c) => ({
      studentId: c.studentId,
      modalityCode,
      gradeId: c.gradeId,
      source: "MIGRATION",
      awardedAt: now,
      awardedByUserId: auth.userId,
      notes: "Grau inicial (migração das faixas por XP)",
    }));
  if (toInsert.length) {
    const { error } = await supabase.from("StudentGrade").insert(toInsert);
    if (error) {
      console.error("applyInitialGrades insert:", error);
      return { error: "Não foi possível gravar os graus." };
    }
  }

  revalidatePath(`/admin/graduacao/${modalityCode}/migracao`);
  return { applied: allowed.length };
}

/** Modalidade composta (ex.: MMA): define as modalidades base cujos graus o aluno vê. Vazio = desligar. */
export async function setGraduationComponents(modalityCode: string, components: string[]): Promise<{ error?: string; success?: boolean }> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  if (!isNetworkScope(await getSchoolScope())) return { error: "Só o Admin Geral pode alterar o programa de graduação da rede." };
  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração Supabase em falta." };

  const { data: modalities } = await result.client.from("ModalityRef").select("code");
  const valid = new Set((modalities ?? []).map((m) => m.code as string));
  if (!valid.has(modalityCode)) return { error: "Modalidade não encontrada." };
  const clean = [...new Set(components)].filter((c) => c !== modalityCode && valid.has(c));

  const { error } = await result.client.from("ModalityRef").update({ graduationModalities: clean }).eq("code", modalityCode);
  if (error) {
    console.error("setGraduationComponents:", error);
    return { error: "Não foi possível guardar." };
  }
  revalidatePath("/admin/graduacao");
  revalidatePath(`/admin/graduacao/${modalityCode}`);
  return { success: true };
}

/**
 * Atalho na ficha do aluno: atribui à mão o grau que o aluno já tinha noutra escola (ou limpa-o).
 * `awardedDate` é a data real do grau (AAAA-MM-DD): o tempo de treino conta a partir dela.
 * Alunos com grau obtido em exame aqui não são alterados.
 */
export async function setStudentGrade(input: {
  studentId: string;
  modalityCode: string;
  gradeId: string | null;
  awardedDate: string;
  origin: string;
}): Promise<{ error?: string; success?: boolean }> {
  const auth = await authorize();
  if ("error" in auth) return { error: auth.error };
  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração Supabase em falta." };
  const supabase = result.client;

  const { studentId, modalityCode, gradeId } = input;
  if (!studentId || !modalityCode) return { error: "Dados em falta." };
  { const schoolErr = await schoolAccessErrorForStudent(studentId); if (schoolErr) return { error: schoolErr }; }

  const { data: exam } = await supabase
    .from("StudentGrade")
    .select("id")
    .eq("studentId", studentId)
    .eq("modalityCode", modalityCode)
    .eq("source", "EXAM")
    .limit(1);
  if ((exam ?? []).length > 0) return { error: "Este aluno já tem um grau obtido em exame nesta modalidade." };

  let when: Date | null = null;
  let template: Awaited<ReturnType<typeof loadGraduationTemplate>> = null;
  if (gradeId) {
    template = await loadGraduationTemplate(supabase, modalityCode);
    if (!template || !template.grades.some((g) => g.id === gradeId)) return { error: "Grau inválido para esta modalidade." };
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.awardedDate.trim());
    when = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)) : null;
    if (!when || Number.isNaN(when.getTime())) return { error: "Data inválida." };
    if (when.getTime() > Date.now()) return { error: "A data do grau não pode ser no futuro." };
  }

  const { error: delErr } = await supabase
    .from("StudentGrade")
    .delete()
    .eq("studentId", studentId)
    .eq("modalityCode", modalityCode)
    .in("source", ["MIGRATION", "MANUAL"]);
  if (delErr) return { error: "Não foi possível atualizar o grau." };

  if (gradeId && when) {
    const origin = input.origin.trim().slice(0, 200);
    const { error } = await supabase.from("StudentGrade").insert({
      studentId,
      modalityCode,
      gradeId,
      source: "MANUAL",
      awardedAt: when.toISOString(),
      awardedByUserId: auth.userId,
      notes: origin ? `Grau de outra escola: ${origin}` : "Grau atribuído manualmente (outra escola)",
    });
    if (error) {
      console.error("setStudentGrade insert:", error);
      return { error: "Não foi possível gravar o grau." };
    }
  }

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/dashboard/graduacao");
  return { success: true };
}
