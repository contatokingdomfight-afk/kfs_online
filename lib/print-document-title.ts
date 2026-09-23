import type { SupabaseClient } from "@supabase/supabase-js";

export type MembershipPrintDocumentKind = "contrato" | "comprovativo" | "termo";

const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g;

export function sanitizePrintDocumentNamePart(value: string): string {
  return value.replace(INVALID_FILENAME_CHARS, "").replace(/\s+/g, " ").trim();
}

/** Título do documento (usado pelo browser como nome ao «Guardar como PDF»). */
export function buildMembershipPrintDocumentTitle(
  kind: MembershipPrintDocumentKind,
  studentName: string
): string {
  const name = sanitizePrintDocumentNamePart(studentName) || "Aluno";
  if (kind === "comprovativo") return `Comprovativo de adesão ${name}`;
  if (kind === "termo") return `Termo de responsabilidade ${name}`;
  return `Contrato de adesão ${name}`;
}

export async function loadStudentPrintName(
  supabase: SupabaseClient,
  studentId: string,
  fallback?: string | null
): Promise<string> {
  const { data: student } = await supabase
    .from("Student")
    .select("userId")
    .eq("id", studentId)
    .maybeSingle();

  if (!student?.userId) {
    return sanitizePrintDocumentNamePart(fallback ?? "") || "Aluno";
  }

  const { data: user } = await supabase
    .from("User")
    .select("name")
    .eq("id", student.userId)
    .maybeSingle();

  const name = user?.name?.trim() || fallback?.trim() || "";
  return sanitizePrintDocumentNamePart(name) || "Aluno";
}
