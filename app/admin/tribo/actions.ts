"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminDeleteTribePost,
  hideTribeComment,
  hideTribePost,
  loadTribeCommentsForAdmin,
  unhideTribeComment,
  unhideTribePost,
  type TribeAdminComment,
} from "@/lib/tribe/moderation";

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { ok: false, error: "Não autorizado." };
  return { ok: true, userId: dbUser.id };
}

export async function adminHideTribePostAction(postId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const result = await hideTribePost(createAdminClient(), postId, gate.userId);
  revalidatePath("/admin/tribo");
  revalidatePath("/dashboard/tribo");
  return result;
}

export async function adminUnhideTribePostAction(postId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const result = await unhideTribePost(createAdminClient(), postId);
  revalidatePath("/admin/tribo");
  revalidatePath("/dashboard/tribo");
  return result;
}

export async function adminDeleteTribePostAction(postId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const result = await adminDeleteTribePost(createAdminClient(), postId, gate.userId);
  revalidatePath("/admin/tribo");
  revalidatePath("/dashboard/tribo");
  return result;
}

export async function adminHideTribeCommentAction(commentId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const result = await hideTribeComment(createAdminClient(), commentId);
  revalidatePath("/admin/tribo");
  revalidatePath("/dashboard/tribo");
  return result;
}

export async function adminUnhideTribeCommentAction(commentId: string): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const result = await unhideTribeComment(createAdminClient(), commentId);
  revalidatePath("/admin/tribo");
  revalidatePath("/dashboard/tribo");
  return result;
}

export async function adminListTribeCommentsAction(
  postId: string
): Promise<{ error?: string; comments: TribeAdminComment[] }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error, comments: [] };
  const comments = await loadTribeCommentsForAdmin(createAdminClient(), postId);
  return { comments };
}
