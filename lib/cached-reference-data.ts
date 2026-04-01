import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

function supabaseForReliableRead(fallback: SupabaseClient): SupabaseClient {
  return getAdminClientOrNull().client ?? fallback;
}

export type CachedLocation = { id: string; name: string };
export type CachedModalityRef = { code: string; name: string };
export type CachedSchoolOption = { id: string; name: string };

/**
 * Lista de escolas ativas (id, name). Cache 5 min; dados pouco voláteis.
 */
export async function getCachedSchools(
  supabase: SupabaseClient
): Promise<CachedSchoolOption[]> {
  const rows = await unstable_cache(
    async () => {
      const { data } = await supabase
        .from("School")
        .select("id, name")
        .eq("isActive", true)
        .order("name", { ascending: true });
      return data ?? [];
    },
    ["schools-active"],
    { revalidate: 300 }
  )();
  return rows as CachedSchoolOption[];
}

/**
 * Lista de locais (id, name). Cache 5 min; dados pouco voláteis.
 * O callback usa sempre um cliente com leitura fiável (service role se existir) para não
 * cachear [] quando o primeiro pedido corre sem sessão autenticada.
 */
export async function getCachedLocations(
  _supabase: SupabaseClient
): Promise<CachedLocation[]> {
  const rows = await unstable_cache(
    async () => {
      const admin = getAdminClientOrNull().client;
      const client = admin ?? (await createClient());
      const { data } = await client
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
 * Locais de uma escola (sem cache). Para formulários onde o filtro por escola é obrigatório.
 * Usa service role quando existir (igual a `getCachedLocations`) para não devolver lista vazia por RLS/sessão.
 */
export async function getLocationsForSchool(
  supabase: SupabaseClient,
  schoolId: string
): Promise<CachedLocation[]> {
  const client = supabaseForReliableRead(supabase);
  const q = () =>
    client
      .from("Location")
      .select("id, name")
      .eq("schoolId", schoolId)
      .order("sortOrder", { ascending: true });

  let { data, error } = await q();
  if (error) {
    console.error("getLocationsForSchool (ordered):", error.message);
    const r2 = await client
      .from("Location")
      .select("id, name")
      .eq("schoolId", schoolId);
    data = r2.data;
    error = r2.error;
    if (error) {
      console.error("getLocationsForSchool:", error.message);
      return [];
    }
  }
  return data ?? [];
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
