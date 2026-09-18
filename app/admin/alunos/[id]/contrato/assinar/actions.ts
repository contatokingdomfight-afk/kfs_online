"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyEnrollmentFormSubmission, type SaveEnrollmentFormResult } from "@/app/adesao/enrollment-actions";
import { applyAdesaoSigning, type SignAdesaoDocumentsResult } from "@/app/adesao/actions";

/**
 * Variantes admin das acções de /adesao — para preencher/assinar em nome de um aluno sem
 * sessão própria (ex.: sócio Kids, `Student.syntheticLoginEmail`), com o encarregado de
 * educação presente. Usam o cliente admin (service role) em vez da sessão do aluno.
 */
export async function adminSaveEnrollmentForm(
  studentId: string,
  _prev: SaveEnrollmentFormResult | null,
  formData: FormData
): Promise<SaveEnrollmentFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const supabase = createAdminClient();
  const result = await applyEnrollmentFormSubmission(supabase, studentId, formData);
  if (result.error) return result;

  revalidatePath(`/admin/alunos/${studentId}/contrato`);
  revalidatePath(`/admin/alunos/${studentId}/contrato/assinar`);
  revalidatePath("/admin/documentos-adesao");
  redirect(`/admin/alunos/${studentId}/contrato/assinar?passo=2`);
}

export async function adminSignAdesaoDocuments(
  studentId: string,
  _prev: SignAdesaoDocumentsResult | null,
  formData: FormData
): Promise<SignAdesaoDocumentsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const supabase = createAdminClient();
  const result = await applyAdesaoSigning(supabase, studentId, formData);
  if (result.error) return result;

  revalidatePath(`/admin/alunos/${studentId}/contrato`);
  revalidatePath(`/admin/alunos/${studentId}/contrato/assinar`);
  revalidatePath("/admin/documentos-adesao");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documentos-adesao");
  redirect(`/admin/alunos/${studentId}/contrato?assinado=1`);
}
