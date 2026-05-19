/**
 * Gera SQL para registar em supabase_migrations.schema_migrations as migrações
 * locais já reflectidas na BD (ex.: aplicadas via DATABASE_URL) mas ausentes
 * do histórico do Supabase. Usar com execute_sql (MCP) ou psql.
 *
 * Critério "pendente" = mesmo que list-pending-supabase-migrations.mjs (Set em
 * lib/supabase-eu-remote-migration-names.mjs + satisfied com slugs).
 * version = name (basename) para evitar colisões entre ficheiros com o mesmo prefixo numérico.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_EU_REMOTE_MIGRATION_NAMES } from "./lib/supabase-eu-remote-migration-names.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../supabase/migrations");

const remote = SUPABASE_EU_REMOTE_MIGRATION_NAMES;

function slug(b) {
  return b.replace(/^\d+_/, "");
}

function satisfied(b) {
  if (remote.has(b)) return true;
  const s = slug(b);
  if (remote.has(s)) return true;
  if (s === "physical_assessment_request" && remote.has("physical_assessment_request_table")) return true;
  if (s === "physical_assessment_request_grants_status_text" && remote.has("physical_assessment_request_status_to_text"))
    return true;
  return false;
}

function q(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const missing = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => f.slice(0, -4))
  .filter((b) => !satisfied(b));

const stmt = "-- backfilled: schema already applied via repo/DATABASE_URL; history row aligned.";
const createdBy = "kfs_online_repo_sync";

const union = missing.map((name) => `SELECT ${q(name)} AS version, ${q(name)} AS name`).join(" UNION ALL ");

const sql = `INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by)
SELECT version, ARRAY[${q(stmt)}]::text[], name, ${q(createdBy)}
FROM (${union}) AS x
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations m WHERE m.name = x.name);`;

process.stderr.write(`missing count: ${missing.length}\n`);
if (missing.length === 0) {
  process.stderr.write("Nothing to backfill (all local basenames satisfied vs remote set).\n");
} else {
  process.stdout.write(sql);
}

const outIdx = process.argv.indexOf("--out");
if (outIdx >= 0 && process.argv[outIdx + 1] && missing.length > 0) {
  fs.writeFileSync(path.resolve(process.argv[outIdx + 1]), sql, "utf8");
  process.stderr.write(`wrote ${process.argv[outIdx + 1]}\n`);
}
