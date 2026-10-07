import { unstable_cache } from "next/cache";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";

export type PublicTribePhoto = { id: string; url: string };

const MAX_POSTS = 40;
const MAX_PHOTOS = 16;

/**
 * Fotos da Tribo para a área pública (home). Mesmo critério da página pública de partilha
 * (`/t/p/[postId]`): só posts ACTIVE com visibilidade ALL_SCHOOLS — posts SCHOOL_ONLY ou
 * moderados nunca saem daqui.
 */
async function fetchPublicTribePhotos(): Promise<PublicTribePhoto[]> {
  const result = getAdminClientOrNull();
  if (!result.client) return [];
  const supabase = result.client;

  const { data: posts } = await supabase
    .from("TribePost")
    .select("id")
    .eq("status", "ACTIVE")
    .eq("visibility", "ALL_SCHOOLS")
    .order("createdAt", { ascending: false })
    .limit(MAX_POSTS);

  const postIds = (posts ?? []).map((p) => p.id as string);
  if (postIds.length === 0) return [];

  const { data: media } = await supabase
    .from("TribePostMedia")
    .select("id, postId, publicUrl, mimeType, sortOrder")
    .in("postId", postIds)
    .like("mimeType", "image/%")
    .order("sortOrder", { ascending: true });

  // Mantém a ordem dos posts (mais recentes primeiro).
  const rank = new Map(postIds.map((id, i) => [id, i]));
  return (media ?? [])
    .slice()
    .sort((a, b) => (rank.get(a.postId as string) ?? 0) - (rank.get(b.postId as string) ?? 0))
    .map((m) => ({
      id: m.id as string,
      url: rewriteSupabaseLegacyStoragePublicUrl(m.publicUrl as string) ?? (m.publicUrl as string),
    }))
    .filter((p) => Boolean(p.url))
    .slice(0, MAX_PHOTOS);
}

export async function loadPublicTribePhotos(): Promise<PublicTribePhoto[]> {
  return unstable_cache(fetchPublicTribePhotos, ["public-tribe-photos-v1"], {
    revalidate: 300,
    tags: ["public-tribe-photos"],
  })();
}
