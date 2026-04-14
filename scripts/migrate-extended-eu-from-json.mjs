/**
 * Copia tabelas alargadas para o EU a partir de ficheiros JSON (array de objetos por tabela).
 * Útil quando OLD_DATABASE_URL falha localmente mas exportaste dados do legado (ex.: SQL Editor ou MCP).
 *
 * Uso:
 *   node scripts/migrate-extended-eu-from-json.mjs caminho/pasta
 * A pasta deve conter ficheiros <nome-tabela>.json (ex.: Course.json, "EvaluationCriterion.json").
 *
 * Cada ficheiro: JSON array de linhas com chaves = nomes de colunas na BD (camelCase/snake conforme tabela).
 *
 * Requer DATABASE_URL (EU) em .env
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL em falta.");
  process.exit(1);
}

const dir = process.argv[2];
if (!dir || !fs.statSync(dir).isDirectory()) {
  console.error("Uso: node scripts/migrate-extended-eu-from-json.mjs <pasta-com-json>");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

async function tableColumns(tableName) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [tableName],
  );
  return rows.map((r) => r.column_name);
}

try {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const tableName = path.basename(file, ".json");
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`${tableName}: 0 linhas — ignorado.`);
      continue;
    }
    const cols = await tableColumns(tableName);
    const keys = cols.filter((c) => rows[0][c] !== undefined || rows.some((r) => r[c] !== undefined));
    if (keys.length === 0) {
      console.warn(`${tableName}: nenhuma coluna em comum com primeira linha — ignorado.`);
      continue;
    }
    const quoted = keys.map((c) => `"${c}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    let n = 0;
    for (const r of rows) {
      const vals = keys.map((k) => r[k] ?? null);
      await client.query(
        `INSERT INTO "${tableName}" (${quoted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        vals,
      );
      n += 1;
    }
    console.log(`${tableName}: ${n} linhas processadas.`);
  }
  console.log("Concluído.");
} finally {
  await client.end();
}
