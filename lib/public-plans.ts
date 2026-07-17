import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import {
  isFamilyPlan,
  isPlanExcludedFromSelfService,
  KINGDOM_PLAN_PRESENCIAL_I_ID,
} from "@/lib/kingdom-plans-constants";

export type PublicPlan = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  popular: boolean;
  /** Plano família: preço varia por composição do grupo — sem valor fixo, "sob consulta". */
  priceOnRequest: boolean;
};

const CACHE_TAG = "public-plans";

async function fetchPublicPlans(): Promise<PublicPlan[]> {
  const result = getAdminClientOrNull();
  if (!result.client) return [];

  const { data, error } = await result.client
    .from("Plan")
    .select("id, name, description, priceMonthly")
    .eq("isActive", true)
    .order("priceMonthly", { ascending: true });

  if (error) {
    console.error("fetchPublicPlans:", error);
    return [];
  }

  return (data ?? [])
    .filter((p) => isFamilyPlan(p.id, p.name) || !isPlanExcludedFromSelfService(p.id, p.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: (p as { description?: string | null }).description ?? null,
      priceMonthly: Number((p as { priceMonthly: number }).priceMonthly),
      popular: p.id === KINGDOM_PLAN_PRESENCIAL_I_ID,
      priceOnRequest: isFamilyPlan(p.id, p.name),
    }));
}

/** Planos activos para a homepage e outras páginas públicas. */
export async function loadPublicPlans(): Promise<PublicPlan[]> {
  return unstable_cache(fetchPublicPlans, ["public-plans-v1"], {
    revalidate: 300,
    tags: [CACHE_TAG],
  })();
}

/** Chamar após criar/editar/desactivar planos no admin. */
export function revalidatePublicPlans() {
  revalidateTag(CACHE_TAG);
  revalidatePath("/");
}
