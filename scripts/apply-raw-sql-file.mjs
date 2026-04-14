/**
 * Executa SQL bruto (UTF-8) na EU. Aceita caminho ou stdin.
 * Uso: node scripts/apply-raw-sql-file.mjs ficheiro.sql
 *   ou: type ficheiro.sql | node scripts/apply-raw-sql-file.mjs
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

const file = process.argv[2];
const sql = file
  ? fs.readFileSync(path.resolve(file), "utf8")
  : fs.readFileSync(0, "utf8");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log("OK");
} finally {
  await client.end();
}
