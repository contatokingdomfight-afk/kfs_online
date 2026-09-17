import type { SupabaseClient } from "@supabase/supabase-js";

/** Estados visíveis no feed/partilha pública — mantido em sincronia com `loadTribeFeed`/`loadTribeComments`. */
export function isTribePostVisibleToRegularUsers(status: string): boolean {
  return status === "ACTIVE";
}

export function isTribeCommentVisibleToRegularUsers(status: string): boolean {
  return status === "ACTIVE";
}

export type TribeAdminPost = {
  id: string;
  schoolId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  status: string;
  createdAt: string;
  hiddenAt: string | null;
  hiddenByUserId: string | null;
};

export type TribeAdminComment = {
  id: string;
  postId: string;
  authorUserId: string;
  body: string;
  status: string;
  createdAt: string;
};

/** Oculta uma publicação (reversível); não reabre publicações já apagadas. */
export async function hideTribePost(
  supabase: SupabaseClient,
  postId: string,
  adminUserId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("TribePost")
    .update({ status: "HIDDEN", hiddenAt: new Date().toISOString(), hiddenByUserId: adminUserId })
    .eq("id", postId)
    .neq("status", "DELETED");
  if (error) return { error: error.message };
  return {};
}

/** Repõe uma publicação oculta (só a partir de HIDDEN). */
export async function unhideTribePost(supabase: SupabaseClient, postId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("TribePost")
    .update({ status: "ACTIVE", hiddenAt: null, hiddenByUserId: null })
    .eq("id", postId)
    .eq("status", "HIDDEN");
  if (error) return { error: error.message };
  return {};
}

/** Apaga (soft, permanente) uma publicação por decisão de admin — sem opção de repor. */
export async function adminDeleteTribePost(
  supabase: SupabaseClient,
  postId: string,
  adminUserId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("TribePost")
    .update({
      status: "DELETED",
      hiddenAt: new Date().toISOString(),
      hiddenByUserId: adminUserId,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", postId);
  if (error) return { error: error.message };
  return {};
}

export async function hideTribeComment(supabase: SupabaseClient, commentId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("TribeComment").update({ status: "HIDDEN" }).eq("id", commentId);
  if (error) return { error: error.message };
  return {};
}

export async function unhideTribeComment(supabase: SupabaseClient, commentId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("TribeComment").update({ status: "ACTIVE" }).eq("id", commentId);
  if (error) return { error: error.message };
  return {};
}

/** Todos os comentários de uma publicação, incluindo ocultos — só para a vista de admin. */
export async function loadTribeCommentsForAdmin(
  supabase: SupabaseClient,
  postId: string
): Promise<TribeAdminComment[]> {
  const { data } = await supabase
    .from("TribeComment")
    .select("id, postId, authorUserId, body, status, createdAt")
    .eq("postId", postId)
    .order("createdAt", { ascending: true })
    .limit(200);
  return (data ?? []) as TribeAdminComment[];
}
