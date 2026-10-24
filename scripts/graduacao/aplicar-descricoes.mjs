/**
 * Põe as descrições dos itens de graduação a partir de um JSON [{ grade, axis, label, description }].
 * Uso: node scripts/graduacao/aplicar-descricoes.mjs scripts/graduacao/descricoes-mestria.json MUAY_THAI
 * Tudo numa transação: se algum item não existir, nada é alterado.
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const [file, modality = "MUAY_THAI"] = process.argv.slice(2);
if (!file) {
  console.error("Uso: node scripts/graduacao/aplicar-descricoes.mjs <ficheiro.json> [MODALIDADE]");
  process.exit(1);
}
const rows = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  let updated = 0;
  for (const r of rows) {
    const res = await client.query(
      `UPDATE "GraduationItem" i SET "description" = $1
       FROM "GraduationGrade" g JOIN "GraduationTemplate" t ON t.id = g."templateId"
       WHERE i."gradeId" = g.id AND t."modalityCode" = $2 AND g.name = $3 AND i.axis = $4 AND i.label = $5`,
      [r.description, modality, r.grade, r.axis, r.label]
    );
    if (res.rowCount !== 1) throw new Error(`Item não encontrado (ou repetido): ${r.grade} · ${r.axis} · ${r.label} (${res.rowCount})`);
    updated += res.rowCount;
  }
  await client.query("COMMIT");
  console.log(`OK: ${updated} descrições atualizadas em ${modality}.`);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("Nada foi alterado:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
