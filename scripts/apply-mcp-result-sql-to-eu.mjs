/**
 * Lê JSON da resposta MCP (stdin ou ficheiro), extrai `[{"sql":"..."}]`,
 * executa no Postgres EU (DATABASE_URL).
 *
 * Uso: Get-Content mcp.json -Raw | node scripts/apply-mcp-result-sql-to-eu.mjs
 *   ou: node scripts/apply-mcp-result-sql-to-eu.mjs mcp.json
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

function extractSqlFromMcpText(text) {
  const marker = '[{"sql":"';
  const start = text.indexOf(marker);
  if (start === -1) throw new Error('Não encontrei [{"sql":"');
  let i = start + marker.length;
  let out = "";
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") {
      i++;
      if (i >= text.length) break;
      const e = text[i];
      if (e === "n") out += "\n";
      else if (e === "r") out += "\r";
      else if (e === "t") out += "\t";
      else if (e === '"') out += '"';
      else if (e === "\\") out += "\\";
      else out += e;
      i++;
    } else if (c === '"') {
      return out;
    } else {
      out += c;
      i++;
    }
  }
  throw new Error("String sql não terminada");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL em falta.");
  process.exit(1);
}

const inPath = process.argv[2];
const raw = inPath
  ? fs.readFileSync(path.resolve(inPath), "utf8")
  : fs.readFileSync(0, "utf8");

let text = raw.trim();
try {
  const outer = JSON.parse(text);
  if (typeof outer.result === "string") text = outer.result;
} catch {
  /* texto cru */
}

let sql;
try {
  sql = extractSqlFromMcpText(text);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.error("OK (SQL aplicado no EU).");
} finally {
  await client.end();
}
