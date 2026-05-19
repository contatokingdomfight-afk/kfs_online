"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getTribeStudentWriteContext, tribePostVisibleForSchool } from "@/lib/tribe/student-context";
import {
  TRIBE_MAX_BODY_CHARS,
  TRIBE_MAX_COMMENT_CHARS,
  TRIBE_IMAGE_MIMES,
  TRIBE_MAX_MEDIA_BYTES,
  TRIBE_MAX_MEDIA_FILES,
} from "@/lib/tribe/constants";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { loadTribeComments } from "@/lib/tribe/feed";

export type TribeVisibility = "SCHOOL_ONLY" | "ALL_SCHOOLS";

export async function createTribePostAction(formData: FormData): Promise<{ error?: string; postId?: string }> {
  const gate = await getTribeStudentWriteContext();
  if (!gate.ok) {
    if (gate.error === "admin") return { error: "Serviço temporariamente indisponível." };
    if (gate.error === "missing_school") {
      return { error: "A tua conta não está associada a uma escola; não é possível publicar na Tribo." };
    }
    if (gate.error === "no_plan_student") return { error: "Precisas de um plano activo para publicar na Tribo." };
    if (gate.error === "student") return { error: "Precisas de sessão de aluno com plano activo para publicar na Tribo." };
    return { error: "Não autorizado." };
  }
  const { supabase, schoolId, userId } = gate.ctx;

  const body = String(formData.get("body") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "SCHOOL_ONLY") as TribeVisibility;
  if (body.length === 0 || body.length > TRIBE_MAX_BODY_CHARS) {
    return { error: `Texto inválido (máx. ${TRIBE_MAX_BODY_CHARS} caracteres).` };
  }
  if (visibility !== "SCHOOL_ONLY" && visibility !== "ALL_SCHOOLS") {
    return { error: "Visibilidade inválida." };
  }

  const files = formData
    .getAll("images")
    .filter((x): x is File => x instanceof File && x.size > 0)
    .slice(0, TRIBE_MAX_MEDIA_FILES);

  for (const f of files) {
    if (!TRIBE_IMAGE_MIMES.has(f.type)) return { error: "Só são permitidas imagens (JPEG, PNG, WebP) ou GIF." };
    if (f.size > TRIBE_MAX_MEDIA_BYTES) return { error: "Cada ficheiro deve ter no máximo 3 MB." };
  }

  const postId = randomUUID();

  const { error: insErr } = await supabase.from("TribePost").insert({
    id: postId,
    schoolId,
    authorUserId: userId,
    body,
    visibility,
    status: "ACTIVE",
  });
  if (insErr) {
    console.error("[createTribePostAction]", insErr);
    return { error: insErr.message };
  }

  let sortOrder = 0;
  for (const file of files) {
    const ext =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
              ? "gif"
              : "bin";
    const path = `tribe/${schoolId}/${postId}/${randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("tribe-media").upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (upErr) {
      console.error("[createTribePostAction] upload", upErr);
      await supabase.from("TribePost").update({ status: "DELETED" }).eq("id", postId);
      return { error: upErr.message || "Erro ao enviar imagens." };
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("tribe-media").getPublicUrl(path);

    const { error: mErr } = await supabase.from("TribePostMedia").insert({
      id: randomUUID(),
      postId,
      publicUrl,
      mimeType: file.type,
      sortOrder: sortOrder++,
    });
    if (mErr) {
      console.error("[createTribePostAction] media row", mErr);
      await supabase.from("TribePost").update({ status: "DELETED" }).eq("id", postId);
      return { error: mErr.message };
    }
  }

  revalidatePath("/dashboard/tribo");
  return { postId };
}

export async function toggleTribeLikeAction(postId: string): Promise<{ error?: string; liked?: boolean }> {
  const gate = await getTribeStudentWriteContext();
  if (!gate.ok) return { error: "Não autorizado." };
  const { supabase, userId, schoolId } = gate.ctx;

  const { data: post } = await supabase
    .from("TribePost")
    .select("id, schoolId, visibility, status")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.status !== "ACTIVE") return { error: "Publicação não encontrada." };
  if (!tribePostVisibleForSchool(post as { visibility: string; schoolId: string }, schoolId)) {
    return { error: "Não autorizado." };
  }

  const { data: existing } = await supabase.from("TribeLike").select("id").eq("postId", postId).eq("userId", userId).maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from("TribeLike").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/tribo");
    return { liked: false };
  }

  const { error } = await supabase.from("TribeLike").insert({
    id: randomUUID(),
    postId,
    userId,
  });
  if (error) {
    if (error.code === "23505") return { liked: true };
    return { error: error.message };
  }
  revalidatePath("/dashboard/tribo");
  return { liked: true };
}

export async function addTribeCommentAction(postId: string, body: string): Promise<{ error?: string }> {
  const gate = await getTribeStudentWriteContext();
  if (!gate.ok) return { error: "Não autorizado." };
  const { supabase, userId, schoolId } = gate.ctx;

  const text = body.trim();
  if (!text || text.length > TRIBE_MAX_COMMENT_CHARS) return { error: "Comentário inválido." };

  const { data: post } = await supabase
    .from("TribePost")
    .select("id, schoolId, visibility, status, authorUserId")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.status !== "ACTIVE") return { error: "Publicação não encontrada." };
  if (!tribePostVisibleForSchool(post as { visibility: string; schoolId: string }, schoolId)) {
    return { error: "Não autorizado." };
  }

  const { error } = await supabase.from("TribeComment").insert({
    id: randomUUID(),
    postId,
    authorUserId: userId,
    body: text,
    status: "ACTIVE",
  });
  if (error) return { error: error.message };

  const authorUserId = post.authorUserId as string;
  if (authorUserId !== userId) {
    const { data: authorStudent } = await supabase.from("Student").select("id").eq("userId", authorUserId).maybeSingle();
    const sid = authorStudent?.id as string | undefined;
    if (sid) {
      await createInAppNotification(supabase, {
        studentId: sid,
        type: "TRIBE_COMMENT",
        title: "Novo comentário na Tribo",
        body: "Alguém comentou na tua publicação.",
        href: `/dashboard/tribo?post=${postId}`,
      });
    }
  }

  revalidatePath("/dashboard/tribo");
  return {};
}

export async function deleteOwnTribePostAction(postId: string): Promise<{ error?: string }> {
  const gate = await getTribeStudentWriteContext();
  if (!gate.ok) return { error: "Não autorizado." };
  const { supabase, userId } = gate.ctx;

  const { data: post } = await supabase.from("TribePost").select("id, authorUserId").eq("id", postId).maybeSingle();
  if (!post || post.authorUserId !== userId) return { error: "Não encontrado." };

  const { error } = await supabase.from("TribePost").update({ status: "DELETED", updatedAt: new Date().toISOString() }).eq("id", postId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/tribo");
  return {};
}

export async function listTribeCommentsAction(
  postId: string
): Promise<{ error?: string; comments: Awaited<ReturnType<typeof loadTribeComments>> }> {
  const gate = await getTribeStudentWriteContext();
  if (!gate.ok) return { error: "Não autorizado.", comments: [] };
  const comments = await loadTribeComments(gate.ctx.supabase, postId, gate.ctx.schoolId, gate.ctx.userId);
  return { comments };
}
