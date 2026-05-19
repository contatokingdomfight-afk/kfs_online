/**
 * Aplica migrações SQL locais em falta (comparando com o histórico remoto em DOCS/scripts list logic)
 * directamente na base via DATABASE_URL (.env).
 *
 * Não actualiza supabase_migrations por si só. Para registar no dashboard: MCP apply_migration, ou após
 * aplicar SQL por aqui, scripts/backfill-supabase-migration-history.mjs + execute_sql (ver DOCS/memory.md).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";
import { SUPABASE_EU_REMOTE_MIGRATION_NAMES } from "./lib/supabase-eu-remote-migration-names.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const remote = SUPABASE_EU_REMOTE_MIGRATION_NAMES;

function slug(b) {
  return b.replace(/^\d+_/, "");
}

function satisfied(b) {
  if (remote.has(b)) return true;
  const s = slug(b);
  if (remote.has(s)) return true;
  if (s === "physical_assessment_request" && remote.has("physical_assessment_request_table")) return true;
  if (s === "physical_assessment_request_grants_status_text" && remote.has("physical_assessment_request_status_to_text")) return true;
  return false;
}

const migrationsDir = path.join(root, "supabase", "migrations");
let pending = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => f.slice(0, -4))
  .filter((b) => !satisfied(b));

const resumeArg = process.argv.find((a) => a.startsWith("--resume="));
if (resumeArg) {
  const from = resumeArg.slice("--resume=".length).trim();
  pending = pending.filter((n) => n >= from);
  if (pending.length === 0) {
    console.error(`Nada a aplicar a partir de ${from}`);
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL em falta no .env");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

let ok = 0;
for (const name of pending) {
  const filePath = path.join(migrationsDir, `${name}.sql`);
  let sql = fs.readFileSync(filePath, "utf8");
  const executable = sql
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith("--");
    })
    .join("\n")
    .trim();
  if (!executable) {
    sql = "SELECT 1;";
  }

  process.stdout.write(`→ ${name} … `);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("OK");
    ok++;
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = String(e?.message ?? e).toLowerCase();
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("multiple primary keys") ||
      msg.includes("violates unique constraint")
    ) {
      console.log("SKIP (já na BD)");
      ok++;
      continue;
    }
    console.log("ERRO");
    console.error(e.message);
    process.exitCode = 1;
    break;
  }
}

await client.end();
console.error(`Concluídas com sucesso: ${ok}/${pending.length}`);
