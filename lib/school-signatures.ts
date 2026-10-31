import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

export type SchoolSignature = { name: string; imageUrl: string };

/**
 * Assinaturas fixas dos admins marcados como "assina pela escola" — aparecem nos documentos de
 * adesão (comprovativo, contrato, termo) ao lado da assinatura do aluno.
 *
 * Usa sempre o client admin (service role) internamente: as páginas do aluno passam um client
 * com RLS, que não tem acesso de leitura à flag `signsForSchool` de outros utilizadores.
 */
export async function getActiveSchoolSignatures(schoolId: string): Promise<SchoolSignature[]> {
  const result = getAdminClientOrNull();
  if (!result.client) return [];
  const supabase = result.client;

  // Noutra escola assinam os seus diretores. Na Sede assinam os admins, menos quem só dirige outras escolas.
  const { data: links } = await supabase.from("SchoolDirector").select("userId, schoolId");
  const directorLinks = (links ?? []) as { userId: string; schoolId: string }[];
  const directorsHere = new Set(directorLinks.filter((l) => l.schoolId === schoolId).map((l) => l.userId));
  const directorsElsewhere = new Set(directorLinks.filter((l) => l.schoolId !== schoolId).map((l) => l.userId));
  const isSede = schoolId === SEDE_SCHOOL_ID;
  if (!isSede && directorsHere.size === 0) return [];

  const { data } = await supabase
    .from("User")
    .select("id, name, email, schoolSignatureImageUrl")
    .eq("role", "ADMIN")
    .eq("signsForSchool", true)
    .not("schoolSignatureImageUrl", "is", null)
    .order("name", { ascending: true });

  return (data ?? [])
    .filter((row) => {
      const id = (row as { id: string }).id;
      return directorsHere.has(id) || (isSede && !directorsElsewhere.has(id));
    })
    .map((row) => ({
      name: (row as { name?: string | null; email?: string }).name?.trim() || (row as { email?: string }).email || "",
      imageUrl: (row as { schoolSignatureImageUrl?: string | null }).schoolSignatureImageUrl ?? "",
    }))
    .filter((s) => s.imageUrl);
}
