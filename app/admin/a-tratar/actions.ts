"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import {
  createCoachInAppNotification,
  createInAppNotification,
  notifyCoachesOfPhysicalAssessmentRequest,
} from "@/lib/notifications/in-app";
import { loadAdminTodo, type AdminTodoItem } from "@/lib/admin-todo";
import { ADMIN_TODO_ORDER, type AdminTodoKind } from "@/lib/admin-todo-rules";

export type TodoActionState = { error?: string; ok?: boolean; count?: number } | null;

async function context() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." } as const;
  const permErr = await adminPermissionError("admin:financeiro:read");
  if (permErr) return { error: permErr } as const;
  const supabase = getAdminClientOrNull().client;
  if (!supabase) return { error: "Configuração do servidor em falta." } as const;
  return { dbUser, supabase } as const;
}

type ItemRef = { kind: AdminTodoKind; doneKey: string; studentId: string | null; label: string | null };

function readItem(formData: FormData): ItemRef | null {
  const kind = String(formData.get("kind") ?? "") as AdminTodoKind;
  const doneKey = String(formData.get("doneKey") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim() || null;
  const label = String(formData.get("label") ?? "").trim().slice(0, 200) || null;
  if (!ADMIN_TODO_ORDER.includes(kind) || !doneKey) return null;
  return { kind, doneKey, studentId, label };
}

const refOf = (it: AdminTodoItem): ItemRef => ({ kind: it.kind, doneKey: it.key, studentId: it.studentId, label: it.name });

async function recordDone(supabase: SupabaseClient, userId: string, item: ItemRef, action: string): Promise<string | null> {
  const { error } = await supabase
    .from("AdminTodoDone")
    .upsert(
      { kind: item.kind, doneKey: item.doneKey, studentId: item.studentId, label: item.label, action, doneByUserId: userId, doneAt: new Date().toISOString() },
      { onConflict: "kind,doneKey" }
    );
  return error ? error.message : null;
}

function revalidate() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/a-tratar");
}

async function remindAdesao(supabase: SupabaseClient, studentId: string) {
  await createInAppNotification(supabase, {
    studentId,
    type: "GENERAL",
    title: "Falta concluir a tua adesão",
    body: "Faltam documentos da tua inscrição. Leva 2 minutos e ficas com tudo em dia.",
    href: "/adesao",
  });
}

/** Cria o pedido de avaliação física (se ainda não houver um pendente) e avisa coaches e aluno. */
async function requestPhysical(supabase: SupabaseClient, studentId: string): Promise<string | null> {
  const { data: st } = await supabase.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  const schoolId = (st as { schoolId?: string } | null)?.schoolId;
  if (!schoolId) return "Aluno sem escola.";
  const { data: existing } = await supabase.from("PhysicalAssessmentRequest").select("id").eq("studentId", studentId).eq("status", "PENDING").maybeSingle();
  if (existing) return null;
  const { error } = await supabase
    .from("PhysicalAssessmentRequest")
    .insert({ id: crypto.randomUUID(), studentId, schoolId, note: "Renovação semestral (pedido pela secretaria)." });
  if (error) return "Não foi possível criar o pedido.";
  await notifyCoachesOfPhysicalAssessmentRequest(supabase, { schoolId, studentId }).catch(() => undefined);
  await createInAppNotification(supabase, {
    studentId,
    type: "PHYSICAL_ASSESSMENT_REQUEST",
    title: "Está na altura de renovar a avaliação física",
    body: "Fala com o teu coach na próxima aula para marcarem a avaliação.",
    href: "/dashboard/ficha-fisica",
  });
  return null;
}

/** «Feito»: tira o item da lista e guarda no histórico. */
export async function markTodoDoneAction(_prev: TodoActionState, formData: FormData): Promise<TodoActionState> {
  const ctx = await context();
  if ("error" in ctx) return { error: ctx.error };
  const item = readItem(formData);
  if (!item) return { error: "Item inválido." };
  const err = await recordDone(ctx.supabase, ctx.dbUser.id, item, String(formData.get("action") ?? "done").slice(0, 40));
  if (err) return { error: "Não foi possível guardar. Tenta outra vez." };
  revalidate();
  return { ok: true };
}

/** Adesão: lembrete no sino do aluno (com ligação para concluir) e fica tratado esta semana. */
export async function remindAdesaoAction(_prev: TodoActionState, formData: FormData): Promise<TodoActionState> {
  const ctx = await context();
  if ("error" in ctx) return { error: ctx.error };
  const item = readItem(formData);
  if (!item?.studentId || item.kind !== "adesao") return { error: "Item inválido." };
  await remindAdesao(ctx.supabase, item.studentId);
  const err = await recordDone(ctx.supabase, ctx.dbUser.id, item, "lembrete");
  if (err) return { error: "Lembrete enviado, mas não foi possível marcar como feito." };
  revalidate();
  return { ok: true };
}

/** Avaliação física: cria o pedido (como o aluno faria), avisa os coaches da escola e o aluno. */
export async function requestPhysicalAssessmentAction(_prev: TodoActionState, formData: FormData): Promise<TodoActionState> {
  const ctx = await context();
  if ("error" in ctx) return { error: ctx.error };
  const item = readItem(formData);
  if (!item?.studentId || item.kind !== "fisicas") return { error: "Item inválido." };
  const reqErr = await requestPhysical(ctx.supabase, item.studentId);
  if (reqErr) return { error: reqErr };
  const err = await recordDone(ctx.supabase, ctx.dbUser.id, item, "pedido");
  if (err) return { error: "Pedido criado, mas não foi possível marcar como feito." };
  revalidate();
  return { ok: true };
}

/**
 * Ação em lote de um alerta. A lista é recalculada no servidor (não se confia na do browser):
 * adesão → lembrete a todos; avaliações físicas → pedido a todos; carga → aviso aos coaches.
 */
export async function bulkTodoAction(_prev: TodoActionState, formData: FormData): Promise<TodoActionState> {
  const ctx = await context();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, dbUser } = ctx;
  const kind = String(formData.get("kind") ?? "") as AdminTodoKind;
  const schoolId = String(formData.get("schoolId") ?? "").trim() || null;
  if (kind !== "adesao" && kind !== "fisicas" && kind !== "carga") return { error: "Ação em lote indisponível para este alerta." };

  const group = (await loadAdminTodo(supabase, schoolId)).find((g) => g.kind === kind);
  const items = (group?.items ?? []).filter((it) => it.studentId && !(kind === "fisicas" && it.requested));
  if (items.length === 0) return { ok: true, count: 0 };

  let count = 0;
  if (kind === "adesao") {
    for (const it of items) {
      await remindAdesao(supabase, it.studentId!);
      await recordDone(supabase, dbUser.id, refOf(it), "lembrete");
      count++;
    }
  } else if (kind === "fisicas") {
    for (const it of items) {
      const err = await requestPhysical(supabase, it.studentId!);
      if (err) continue;
      await recordDone(supabase, dbUser.id, refOf(it), "pedido");
      count++;
    }
  } else {
    // Carga alta: uma notificação por coach das escolas destes alunos, com os nomes.
    const { data: rows } = await supabase.from("Student").select("id, schoolId").in("id", items.map((it) => it.studentId!));
    const schoolByStudent = new Map(((rows ?? []) as { id: string; schoolId: string }[]).map((r) => [r.id, r.schoolId]));
    const bySchool = new Map<string, AdminTodoItem[]>();
    for (const it of items) {
      const sid = schoolByStudent.get(it.studentId!);
      if (!sid) continue;
      bySchool.set(sid, [...(bySchool.get(sid) ?? []), it]);
    }
    for (const [sid, list] of bySchool) {
      const { data: links } = await supabase.from("CoachSchool").select("coachId").eq("schoolId", sid);
      const coachIds = [...new Set(((links ?? []) as { coachId: string }[]).map((l) => l.coachId))];
      const { data: coaches } = coachIds.length ? await supabase.from("Coach").select("userId").in("id", coachIds).eq("is_active", true) : { data: [] };
      const names = list.map((it) => it.name).join(", ");
      for (const c of (coaches ?? []) as { userId: string }[]) {
        await createCoachInAppNotification(supabase, {
          coachUserId: c.userId,
          type: "GENERAL",
          title: list.length === 1 ? "1 aluno com carga de treino alta" : `${list.length} alunos com carga de treino alta`,
          body: `${names}: mais de 1,5× o normal esta semana. Sugestão: técnica e drills, sem sparring, até baixar.`,
          href: "/coach/carga",
        });
      }
      for (const it of list) {
        await recordDone(supabase, dbUser.id, refOf(it), "coaches avisados");
        count++;
      }
    }
  }
  revalidate();
  return { ok: true, count };
}
