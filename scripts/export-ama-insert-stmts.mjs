/**
 * Gera ficheiros scripts/_ama_partN.sql com INSERTs idempotentes (ON CONFLICT)
 * a partir do Postgres antigo (OLD_DATABASE_URL). Útil quando o MCP antigo está disponível mas queres correr no EU via DATABASE_URL.
 *
 * Uso: node scripts/export-ama-insert-stmts.mjs
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const sourceUrl =
  process.env.OLD_DATABASE_URL ?? process.env.MIGRATE_SOURCE_DATABASE_URL;
if (!sourceUrl) {
  console.error("Defina OLD_DATABASE_URL.");
  process.exit(1);
}

const batch = 50;
const client = new pg.Client({ connectionString: sourceUrl });
await client.connect();
try {
  const { rows: countRows } = await client.query(
    `SELECT COUNT(*)::int AS c FROM "AthleteMissionAward"`,
  );
  const total = countRows[0].c;
  let part = 0;
  for (let offset = 0; offset < total; offset += batch) {
    const { rows } = await client.query(
      `SELECT 'INSERT INTO "AthleteMissionAward" (id, "athleteId", "dimensionCode", "targetScore", "xpAwarded", "createdAt") VALUES ' ||
        string_agg(
          format('(%L,%L,%L,%s,%s,%L::timestamptz)', id, "athleteId", "dimensionCode", "targetScore", "xpAwarded", "createdAt"),
          E',\n'
        ) ||
        E'\nON CONFLICT ("athleteId", "dimensionCode", "targetScore") DO NOTHING;' AS stmt
       FROM (SELECT * FROM "AthleteMissionAward" ORDER BY id LIMIT $1 OFFSET $2) t`,
      [batch, offset],
    );
    const stmt = rows[0]?.stmt;
    if (!stmt) continue;
    const out = path.join(process.cwd(), "scripts", `_ama_part${part}.sql`);
    fs.writeFileSync(out, stmt);
    console.log("Wrote", out, "offset", offset);
    part += 1;
  }
} finally {
  await client.end();
}
