import type { TribeStudentContext } from "@/lib/tribe/student-context";
import { tribePostVisibleForSchool } from "@/lib/tribe/student-context";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";

export type TribeFeedAuthor = { id: string; name: string | null; avatarUrl: string | null };
export type TribeFeedMedia = { id: string; publicUrl: string; mimeType: string; sortOrder: number };
export type TribeFeedPost = {
  id: string;
  schoolId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: string;
  author: TribeFeedAuthor;
  media: TribeFeedMedia[];
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

function rewriteMediaUrl(url: string): string {
  return rewriteSupabaseLegacyStoragePublicUrl(url) ?? url;
}

export async function loadTribeFeed(ctx: TribeStudentContext, limit = 30): Promise<TribeFeedPost[]> {
  const { supabase, schoolId, userId } = ctx;

  const { data: rawPosts, error } = await supabase
    .from("TribePost")
    .select("id, schoolId, authorUserId, body, visibility, status, createdAt")
    .eq("status", "ACTIVE")
    .order("createdAt", { ascending: false })
    .limit(80);

  if (error || !rawPosts?.length) return [];

  const visible = rawPosts.filter((p) => tribePostVisibleForSchool(p as { visibility: string; schoolId: string }, schoolId)).slice(0, limit);

  const postIds = visible.map((p) => p.id as string);
  if (postIds.length === 0) return [];

  const [{ data: mediaRows }, { data: likeRows }, { data: myLikes }, { data: commentRows }, authorsRes] = await Promise.all([
    supabase.from("TribePostMedia").select("id, postId, publicUrl, mimeType, sortOrder").in("postId", postIds).order("sortOrder", { ascending: true }),
    supabase.from("TribeLike").select("postId").in("postId", postIds),
    supabase.from("TribeLike").select("postId").eq("userId", userId).in("postId", postIds),
    supabase.from("TribeComment").select("id, postId").eq("status", "ACTIVE").in("postId", postIds),
    (async () => {
      const authorIds = [...new Set(visible.map((p) => p.authorUserId as string))];
      const { data: users } = await supabase.from("User").select("id, name, avatarUrl").in("id", authorIds);
      return users ?? [];
    })(),
  ]);

  const mediaByPost = new Map<string, TribeFeedMedia[]>();
  for (const m of mediaRows ?? []) {
    const row = m as { id: string; postId: string; publicUrl: string; mimeType: string; sortOrder: number };
    const list = mediaByPost.get(row.postId) ?? [];
    list.push({
      id: row.id,
      publicUrl: rewriteMediaUrl(row.publicUrl),
      mimeType: row.mimeType,
      sortOrder: row.sortOrder,
    });
    mediaByPost.set(row.postId, list);
  }

  const likeCount = new Map<string, number>();
  for (const l of likeRows ?? []) {
    const pid = (l as { postId: string }).postId;
    likeCount.set(pid, (likeCount.get(pid) ?? 0) + 1);
  }

  const likedSet = new Set((myLikes ?? []).map((l) => (l as { postId: string }).postId));

  const commentCount = new Map<string, number>();
  for (const c of commentRows ?? []) {
    const pid = (c as { postId: string }).postId;
    commentCount.set(pid, (commentCount.get(pid) ?? 0) + 1);
  }

  const authorMap = new Map((authorsRes as { id: string; name: string | null; avatarUrl: string | null }[]).map((u) => [u.id, u]));

  return visible.map((p) => {
    const pid = p.id as string;
    const au = authorMap.get(p.authorUserId as string);
    return {
      id: pid,
      schoolId: p.schoolId as string,
      authorUserId: p.authorUserId as string,
      body: p.body as string,
      visibility: p.visibility as string,
      createdAt: p.createdAt as string,
      author: {
        id: p.authorUserId as string,
        name: au?.name ?? null,
        avatarUrl: au?.avatarUrl ? (rewriteMediaUrl(au.avatarUrl) ?? au.avatarUrl) : null,
      },
      media: mediaByPost.get(pid) ?? [],
      likeCount: likeCount.get(pid) ?? 0,
      likedByMe: likedSet.has(pid),
      commentCount: commentCount.get(pid) ?? 0,
    };
  });
}

export async function loadTribeComments(supabase: TribeStudentContext["supabase"], postId: string, schoolId: string, userId: string) {
  const { data: post } = await supabase
    .from("TribePost")
    .select("id, schoolId, visibility, status")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.status !== "ACTIVE") return [];
  if (!tribePostVisibleForSchool(post as { visibility: string; schoolId: string }, schoolId)) return [];

  const { data: comments } = await supabase
    .from("TribeComment")
    .select("id, authorUserId, body, createdAt")
    .eq("postId", postId)
    .eq("status", "ACTIVE")
    .order("createdAt", { ascending: true })
    .limit(80);

  const authorIds = [...new Set((comments ?? []).map((c) => (c as { authorUserId: string }).authorUserId))];
  const { data: users } = authorIds.length ? await supabase.from("User").select("id, name, avatarUrl").in("id", authorIds) : { data: [] };

  const umap = new Map((users ?? []).map((u) => [u.id as string, u as { name: string | null; avatarUrl: string | null }]));

  return (comments ?? []).map((c) => {
    const row = c as { id: string; authorUserId: string; body: string; createdAt: string };
    const u = umap.get(row.authorUserId);
    return {
      id: row.id,
      authorUserId: row.authorUserId,
      body: row.body,
      createdAt: row.createdAt,
      authorName: u?.name ?? null,
      isMine: row.authorUserId === userId,
    };
  });
}
