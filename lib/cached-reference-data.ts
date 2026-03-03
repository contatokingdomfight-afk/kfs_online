import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export type CachedLocation = { id: string; name: string };
export type CachedModalityRef = { code: string; name: string };

/**
 * Lista de locais (id, name). Cache 5 min; dados pouco voláteis.
 */
export async function getCachedLocations(
  supabase: SupabaseClient
): Promise<CachedLocation[]> {
  const rows = await unstable_cache(
    async () => {
      const { data } = await supabase
        .from("Location")
        .select("id, name")
        .order("sortOrder", { ascending: true });
      return data ?? [];
    },
    ["locations-all"],
    { revalidate: 300 }
  )();
  return rows as CachedLocation[];
}

/**
 * Lista de modalidades (code, name). Cache 5 min; dados pouco voláteis.
 */
export async function getCachedModalityRefs(
  supabase: SupabaseClient
): Promise<CachedModalityRef[]> {
  const rows = await unstable_cache(
    async () => {
      const { data } = await supabase
        .from("ModalityRef")
        .select("code, name")
        .order("sortOrder", { ascending: true });
      return data ?? [];
    },
    ["modality-refs-all"],
    { revalidate: 300 }
  )();
  return rows as CachedModalityRef[];
}
