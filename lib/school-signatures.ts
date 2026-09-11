import { getAdminClientOrNull } from "@/lib/supabase/admin";

export type SchoolSignature = { name: string; imageUrl: string };

/**
 * Assinaturas fixas dos admins marcados como "assina pela escola" — aparecem nos documentos de
 * adesão (comprovativo, contrato, termo) ao lado da assinatura do aluno.
 *
 * Usa sempre o client admin (service role) internamente: as páginas do aluno passam um client
 * com RLS, que não tem acesso de leitura à flag `signsForSchool` de outros utilizadores.
 */
export async function getActiveSchoolSignatures(): Promise<SchoolSignature[]> {
  const result = getAdminClientOrNull();
  if (!result.client) return [];
  const supabase = result.client;

  const { data } = await supabase
    .from("User")
    .select("name, email, schoolSignatureImageUrl")
    .eq("role", "ADMIN")
    .eq("signsForSchool", true)
    .not("schoolSignatureImageUrl", "is", null)
    .order("name", { ascending: true });

  return (data ?? [])
    .map((row) => ({
      name: (row as { name?: string | null; email?: string }).name?.trim() || (row as { email?: string }).email || "",
      imageUrl: (row as { schoolSignatureImageUrl?: string | null }).schoolSignatureImageUrl ?? "",
    }))
    .filter((s) => s.imageUrl);
}
