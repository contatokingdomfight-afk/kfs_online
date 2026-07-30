import type { SupabaseClient } from "@supabase/supabase-js";

export const SYNTHETIC_EMAIL_DOMAIN = "alunos.kingdomfight.pt";

/** Normaliza nome completo para slug de email (ex.: Maria Silva → maria.silva). */
export function slugifyStudentName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

export function isSyntheticStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

async function emailExistsInUserTable(supabase: SupabaseClient, email: string): Promise<boolean> {
  const { data } = await supabase.from("User").select("id").ilike("email", email).maybeSingle();
  return Boolean(data?.id);
}

/**
 * Gera email único @alunos.kingdomfight.pt a partir do nome; acrescenta sufixo numérico se colidir.
 */
export async function generateUniqueSyntheticEmail(
  supabase: SupabaseClient,
  fullName: string
): Promise<string> {
  const base = slugifyStudentName(fullName) || "aluno";
  let candidate = `${base}@${SYNTHETIC_EMAIL_DOMAIN}`;
  let suffix = 2;

  while (await emailExistsInUserTable(supabase, candidate)) {
    candidate = `${base}.${suffix}@${SYNTHETIC_EMAIL_DOMAIN}`;
    suffix += 1;
    if (suffix > 200) {
      throw new Error("Não foi possível gerar um email interno único para este aluno.");
    }
  }

  return candidate;
}
