"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { MODALITIES_CACHE_TAG } from "@/lib/cached-reference-data";
import { loadGraduationTemplate } from "@/lib/graduation/load-template";
import { validateSchoolGradeOverride } from "@/lib/graduation/school-overrides";
import { adminPermissionError } from "@/lib/permissions/assert";
import { canAccessSchool, getSchoolScope } from "@/lib/school-scope";
import { schoolModalityCode } from "@/lib/school-modalities-rules";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

/**
 * Configuração híbrida da escola (separador «Configuração» em /admin/escolas/[id]): Admin Geral ou o diretor
 * da escola. Fase 1: modalidades (ligar/desligar as da rede, criar as próprias, propor à rede) e ajustes da graduação.
 */
export type ConfigResult = { error?: string; success?: boolean };

type Ctx = { userId: string; db: NonNullable<ReturnType<typeof getAdminClientOrNull>["client"]> };

async function schoolConfigCtx(schoolId: string): Promise<Ctx | { error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:sistema:write");
  if (permErr) return { error: permErr };
  if (!schoolId || !canAccessSchool(await getSchoolScope(), schoolId)) return { error: "Só podes configurar a tua escola." };
  const db = getAdminClientOrNull().client;
  if (!db) return { error: "Configuração do servidor em falta." };
  return { userId: dbUser.id, db };
}

function revalidateConfig(schoolId: string) {
  revalidateTag(MODALITIES_CACHE_TAG);
  revalidatePath(`/admin/escolas/${schoolId}`);
  revalidatePath("/admin/turmas");
  revalidatePath("/admin/graduacao");
}

/** Modalidade própria desta escola (para editar/apagar/propor). */
async function ownModality(ctx: Ctx, schoolId: string, code: string) {
  const { data } = await ctx.db.from("ModalityRef").select("code, name, schoolId").eq("code", code).maybeSingle();
  return data && data.schoolId === schoolId ? data : null;
}

/** Liga/desliga uma modalidade da rede nesta escola. */
export async function setSchoolModalityEnabled(schoolId: string, code: string, enabled: boolean): Promise<ConfigResult> {
  const ctx = await schoolConfigCtx(schoolId);
  if ("error" in ctx) return ctx;
  const { data: mod } = await ctx.db.from("ModalityRef").select("schoolId").eq("code", code).maybeSingle();
  if (!mod) return { error: "Modalidade não encontrada." };
  if (mod.schoolId) return { error: "Só as modalidades da rede se ligam/desligam aqui." };

  if (!enabled) {
    const { count } = await ctx.db
      .from("Lesson")
      .select("id", { count: "exact", head: true })
      .eq("schoolId", schoolId)
      .eq("modality", code)
      .or("isOneOff.eq.false,date.gte." + new Date().toISOString().slice(0, 10));
    if (count && count > 0) return { error: `Há ${count} aula(s) desta modalidade nos horários da escola. Remove-as primeiro em Turmas.` };
  }
  const { error } = enabled
    ? await ctx.db.from("SchoolModalityDisabled").delete().eq("schoolId", schoolId).eq("modalityCode", code)
    : await ctx.db
        .from("SchoolModalityDisabled")
        .upsert({ schoolId, modalityCode: code, updatedByUserId: ctx.userId }, { onConflict: "schoolId,modalityCode" });
  if (error) {
    console.error("setSchoolModalityEnabled:", error);
    return { error: "Não foi possível guardar. Tenta de novo." };
  }
  revalidateConfig(schoolId);
  return { success: true };
}

/** Cria uma modalidade só desta escola. */
export async function createSchoolModality(schoolId: string, rawName: string): Promise<ConfigResult> {
  const ctx = await schoolConfigCtx(schoolId);
  if ("error" in ctx) return ctx;
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return { error: "O nome tem de ter entre 2 e 40 caracteres." };

  const [{ data: school }, { data: all }] = await Promise.all([
    ctx.db.from("School").select("id, slug").eq("id", schoolId).maybeSingle(),
    ctx.db.from("ModalityRef").select("code, name, schoolId, sortOrder"),
  ]);
  if (!school) return { error: "Escola não encontrada." };
  const clash = (all ?? []).find(
    (m) => (m.schoolId == null || m.schoolId === schoolId) && String(m.name).toLowerCase() === name.toLowerCase()
  );
  if (clash) return { error: clash.schoolId ? "Já tens uma modalidade com este nome." : "Esta modalidade já existe na rede — liga-a na lista acima." };

  const code = schoolModalityCode(name, ((school.slug as string | null) ?? schoolId) as string);
  if ((all ?? []).some((m) => m.code === code)) return { error: "Já existe uma modalidade com um nome parecido." };
  const sortOrder = Math.max(-1, ...(all ?? []).map((m) => Number(m.sortOrder ?? 0))) + 1;

  const { error } = await ctx.db.from("ModalityRef").insert({ code, name, sortOrder, schoolId });
  if (error) {
    console.error("createSchoolModality:", error);
    return { error: error.code === "23505" ? "Já existe uma modalidade com um nome parecido." : "Não foi possível criar. Tenta de novo." };
  }
  revalidateConfig(schoolId);
  return { success: true };
}

/** Muda o nome de uma modalidade própria. */
export async function renameSchoolModality(schoolId: string, code: string, rawName: string): Promise<ConfigResult> {
  const ctx = await schoolConfigCtx(schoolId);
  if ("error" in ctx) return ctx;
  if (!(await ownModality(ctx, schoolId, code))) return { error: "Só podes editar as modalidades da tua escola." };
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return { error: "O nome tem de ter entre 2 e 40 caracteres." };
  const { error } = await ctx.db.from("ModalityRef").update({ name }).eq("code", code);
  if (error) return { error: "Não foi possível guardar. Tenta de novo." };
  revalidateConfig(schoolId);
  return { success: true };
}

/** Apaga uma modalidade própria (só se ainda não tem aulas, alunos com grau nem graduação). */
export async function deleteSchoolModality(schoolId: string, code: string): Promise<ConfigResult> {
  const ctx = await schoolConfigCtx(schoolId);
  if ("error" in ctx) return ctx;
  if (!(await ownModality(ctx, schoolId, code))) return { error: "Só podes apagar as modalidades da tua escola." };
  const [{ count: lessons }, { count: grades }, { count: students }] = await Promise.all([
    ctx.db.from("Lesson").select("id", { count: "exact", head: true }).eq("modality", code),
    ctx.db.from("StudentGrade").select("id", { count: "exact", head: true }).eq("modalityCode", code),
    ctx.db.from("Student").select("id", { count: "exact", head: true }).eq("primaryModality", code),
  ]);
  if ((lessons ?? 0) > 0) return { error: "Não é possível apagar: há aulas com esta modalidade." };
  if ((grades ?? 0) > 0 || (students ?? 0) > 0) return { error: "Não é possível apagar: há alunos nesta modalidade." };
  const { error } = await ctx.db.from("ModalityRef").delete().eq("code", code);
  if (error) {
    console.error("deleteSchoolModality:", error);
    return { error: "Não foi possível apagar. Tenta de novo." };
  }
  revalidateConfig(schoolId);
  return { success: true };
}

/** Propõe (ou retira a proposta) para a modalidade própria passar a ser da rede. O Admin Geral decide em Modalidades. */
export async function proposeModalityToNetwork(schoolId: string, code: string, propose: boolean): Promise<ConfigResult> {
  const ctx = await schoolConfigCtx(schoolId);
  if ("error" in ctx) return ctx;
  if (!(await ownModality(ctx, schoolId, code))) return { error: "Só podes propor as modalidades da tua escola." };
  const { error } = await ctx.db
    .from("ModalityRef")
    .update({ networkProposalAt: propose ? new Date().toISOString() : null })
    .eq("code", code);
  if (error) return { error: "Não foi possível guardar. Tenta de novo." };
  revalidateConfig(schoolId);
  revalidatePath("/admin/modalidades");
  return { success: true };
}

export type GradeOverrideInput = {
  gradeId: string;
  minMonths: number | null;
  minAttendances: number | null;
  minPerformanceAvg: number | null;
};

/**
 * Guarda os ajustes da escola aos graus de uma modalidade da rede (null = valor da rede).
 * Limites: tempo e presenças ±25 %; nota mínima só para cima. Modalidades próprias editam-se no editor de graus.
 */
export async function saveSchoolGradeOverrides(schoolId: string, modalityCode: string, rows: GradeOverrideInput[]): Promise<ConfigResult> {
  const ctx = await schoolConfigCtx(schoolId);
  if ("error" in ctx) return ctx;
  if (!Array.isArray(rows) || rows.length > 100) return { error: "Dados inválidos." };

  const template = await loadGraduationTemplate(ctx.db, modalityCode);
  if (!template) return { error: "Esta modalidade ainda não tem graduação." };
  const gradeById = new Map(template.grades.map((g) => [g.id, g]));

  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const toSave: GradeOverrideInput[] = [];
  const toClear: string[] = [];
  for (const r of rows) {
    const grade = gradeById.get(r.gradeId);
    if (!grade) return { error: "Um dos graus já não existe. Recarrega a página." };
    const o = { minMonths: num(r.minMonths), minAttendances: num(r.minAttendances), minPerformanceAvg: num(r.minPerformanceAvg) };
    // Igual ao da rede = sem ajuste.
    if (o.minMonths === grade.minMonths) o.minMonths = null;
    if (o.minAttendances === grade.minAttendances) o.minAttendances = null;
    if (o.minPerformanceAvg === grade.minPerformanceAvg) o.minPerformanceAvg = null;
    const err = validateSchoolGradeOverride(grade, o);
    if (err) return { error: err };
    if (o.minMonths == null && o.minAttendances == null && o.minPerformanceAvg == null) toClear.push(r.gradeId);
    else toSave.push({ gradeId: r.gradeId, ...o });
  }

  if (toClear.length) {
    const { error } = await ctx.db.from("SchoolGraduationGradeOverride").delete().eq("schoolId", schoolId).in("gradeId", toClear);
    if (error) return { error: "Não foi possível guardar. Tenta de novo." };
  }
  if (toSave.length) {
    const now = new Date().toISOString();
    const { error } = await ctx.db
      .from("SchoolGraduationGradeOverride")
      .upsert(toSave.map((r) => ({ ...r, schoolId, updatedByUserId: ctx.userId, updatedAt: now })), { onConflict: "schoolId,gradeId" });
    if (error) {
      console.error("saveSchoolGradeOverrides:", error);
      return { error: "Não foi possível guardar. Tenta de novo." };
    }
  }
  revalidatePath(`/admin/escolas/${schoolId}`);
  revalidatePath("/coach/graduacao");
  revalidatePath("/dashboard/graduacao");
  return { success: true };
}
