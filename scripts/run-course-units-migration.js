/**
 * Executa a migration add_course_units.sql no Supabase.
 * Uso: node scripts/run-course-units-migration.js
 * Requer: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env
 */

const fs = require("fs");
const path = require("path");

async function main() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Ficheiro .env não encontrado.");
    process.exit(1);
  }
  const env = fs.readFileSync(envPath, "utf8");
  const url = env.match(/SUPABASE_URL=(.+)/)?.[1]?.trim();
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
  if (!url || !key) {
    console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env");
    process.exit(1);
  }

  const migrationPath = path.join(process.cwd(), "prisma", "migrations", "add_course_units.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql }),
  }).catch(() => null);

  if (!res?.ok) {
    console.log("O Supabase REST API pode não suportar exec_sql. Execute manualmente no SQL Editor:");
    console.log("1. Abra o Supabase Dashboard → SQL Editor");
    console.log("2. Copie o conteúdo de prisma/migrations/add_course_units.sql");
    console.log("3. Execute o script");
    process.exit(1);
  }
  console.log("✓ Migration CourseUnit executada com sucesso.");
}

main();
