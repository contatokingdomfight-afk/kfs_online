import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { adminPermissionError } from "@/lib/permissions/assert";
import { canAccessSchool, getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { offeredModalities, type ModalityOffering } from "@/lib/school-modalities-rules";

export { offeredModalities, type ModalityOffering };

/**
 * Modalidades por escola (configuração híbrida, 2026-11-24): as da rede (ModalityRef.schoolId NULL) menos as
 * desligadas pela escola (SchoolModalityDisabled), mais as próprias da escola (ModalityRef.schoolId = escola).
 */
export async function loadModalityOffering(supabase: SupabaseClient, schoolId: string | null): Promise<ModalityOffering> {
  const db = getAdminClientOrNull().client ?? supabase;
  const [{ data: refs }, { data: disabled }] = await Promise.all([
    db.from("ModalityRef").select("code, name, schoolId, sortOrder").order("sortOrder", { ascending: true }),
    schoolId ? db.from("SchoolModalityDisabled").select("modalityCode").eq("schoolId", schoolId) : Promise.resolve({ data: [] }),
  ]);
  return {
    refs: (refs ?? []).map((r) => ({ code: r.code as string, name: r.name as string, schoolId: (r.schoolId as string | null) ?? null })),
    disabledCodes: new Set(((disabled ?? []) as { modalityCode: string }[]).map((d) => d.modalityCode)),
  };
}

/** Códigos das modalidades que a escola oferece (rede ligadas + próprias). Sem escola → só as da rede. */
export async function schoolModalityCodes(supabase: SupabaseClient, schoolId: string | null): Promise<Set<string>> {
  return new Set(offeredModalities(await loadModalityOffering(supabase, schoolId), schoolId).map((m) => m.code));
}

/** Escola dona da modalidade (null = da rede ou não existe). */
export async function modalityOwnerSchoolId(supabase: SupabaseClient, code: string): Promise<string | null> {
  const db = getAdminClientOrNull().client ?? supabase;
  const { data } = await db.from("ModalityRef").select("schoolId").eq("code", code).maybeSingle();
  return (data?.schoolId as string | null) ?? null;
}

/**
 * Quem pode mexer na definição de uma modalidade (nome, graus, componentes): da rede → só o Admin Geral;
 * própria de uma escola → Admin Geral ou o diretor dessa escola.
 */
export async function modalityEditError(supabase: SupabaseClient, code: string): Promise<string | null> {
  const permErr = await adminPermissionError("admin:sistema:write");
  if (permErr) return permErr;
  const scope = await getSchoolScope();
  if (isNetworkScope(scope)) return null;
  const owner = await modalityOwnerSchoolId(supabase, code);
  if (!owner) return "Só o Admin Geral pode alterar as modalidades e graus da rede. Ajusta-os na configuração da tua escola.";
  return canAccessSchool(scope, owner) ? null : "Esta modalidade é de outra escola.";
}
