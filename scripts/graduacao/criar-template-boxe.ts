/**
 * Cria a graduação de Boxe (BOXING) em RASCUNHO a partir da matriz Kingdom de Boxe.
 * Não publica e não toca em nada se a modalidade já tiver template.
 * Uso: npx tsx scripts/graduacao/criar-template-boxe.ts <email-do-admin>
 */
import { randomUUID } from "crypto";
import path from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildKingdomTemplateDraft } from "../../lib/graduation/kingdom-muay-thai-template";
import { normalizeTemplateDraft } from "../../lib/graduation/template";

config({ path: path.join(process.cwd(), ".env") });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Indica o email do admin.");
  const { data: admin } = await sb.from("User").select("id, role").eq("email", email).maybeSingle();
  if (!admin || admin.role !== "ADMIN") throw new Error("Admin não encontrado.");

  const { data: existing } = await sb.from("GraduationTemplate").select("id").eq("modalityCode", "BOXING").maybeSingle();
  if (existing) {
    console.log("O Boxe já tem template — nada a fazer.");
    return;
  }

  const normalized = normalizeTemplateDraft(buildKingdomTemplateDraft("BOXING", "Graduação Boxe", randomUUID));
  if (!normalized.ok) throw new Error(normalized.error);
  const { error } = await sb.rpc("save_graduation_template", { p_payload: normalized.draft, p_user_id: admin.id });
  if (error) throw error;

  const { data: t } = await sb.from("GraduationTemplate").select("id, isPublished").eq("modalityCode", "BOXING").single();
  const { count } = await sb.from("GraduationGrade").select("id", { count: "exact", head: true }).eq("templateId", t!.id);
  console.log(`Criado: ${count} graus, publicado=${t!.isPublished}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
