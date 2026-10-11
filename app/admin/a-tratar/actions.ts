"use server";

import { revalidatePath } from "next/cache";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createInAppNotification, notifyCoachesOfPhysicalAssessmentRequest } from "@/lib/notifications/in-app";
import { ADMIN_TODO_ORDER, type AdminTodoKind } from "@/lib/admin-todo-rules";

export type TodoActionState = { error?: string; ok?: boolean } | null;

async function context() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." } as const;
  const permErr = await adminPermissionError("admin:financeiro:read");
  if (permErr) return { error: permErr } as const;
  const supabase = getAdminClientOrNull().client;
  if (!supabase) return { error: "Configuração do servidor em falta." } as const;
  return { dbUser, supabase } as const;
}

function readItem(formData: FormData) {
  const kind = String(formData.get("kind") ?? "") as AdminTodoKind;
  const doneKey = String(formData.get("doneKey") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim() || null;
  const label = String(formData.get("label") ?? "").trim().slice(0, 200) || null;
  if (!ADMIN_TODO_ORDER.includes(kind) || !doneKey) return null;
  return { kind, doneKey, studentId, label };
}

async function recordDone(
  supabase: NonNullable<ReturnType<typeof getAdminClientOrNull>["client"]>,
  userId: string,
  item: NonNullable<ReturnType<typeof readItem>>,
  action: string
): Promise<string | null> {
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
  await createInAppNotification(ctx.supabase, {
    studentId: item.studentId,
    type: "GENERAL",
    title: "Falta concluir a tua adesão",
    body: "Faltam documentos da tua inscrição. Leva 2 minutos e ficas com tudo em dia.",
    href: "/adesao",
  });
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
  const { supabase } = ctx;

  const { data: st } = await supabase.from("Student").select("schoolId").eq("id", item.studentId).maybeSingle();
  const schoolId = (st as { schoolId?: string } | null)?.schoolId;
  if (!schoolId) return { error: "Aluno sem escola." };

  const { data: existing } = await supabase
    .from("PhysicalAssessmentRequest")
    .select("id")
    .eq("studentId", item.studentId)
    .eq("status", "PENDING")
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase
      .from("PhysicalAssessmentRequest")
      .insert({ id: crypto.randomUUID(), studentId: item.studentId, schoolId, note: "Renovação semestral (pedido pela secretaria)." });
    if (error) return { error: "Não foi possível criar o pedido." };
    await notifyCoachesOfPhysicalAssessmentRequest(supabase, { schoolId, studentId: item.studentId }).catch(() => undefined);
    await createInAppNotification(supabase, {
      studentId: item.studentId,
      type: "PHYSICAL_ASSESSMENT_REQUEST",
      title: "Está na altura de renovar a avaliação física",
      body: "Fala com o teu coach na próxima aula para marcarem a avaliação.",
      href: "/dashboard/ficha-fisica",
    });
  }
  const err = await recordDone(supabase, ctx.dbUser.id, item, "pedido");
  if (err) return { error: "Pedido criado, mas não foi possível marcar como feito." };
  revalidate();
  return { ok: true };
}
