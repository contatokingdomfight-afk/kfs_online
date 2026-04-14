/**
 * Lê um ficheiro com resposta MCP ({"result":"... coalesce ..."}) ou
 * JSON [{ "coalesce": "[...]" }] ou JSON array direto, e aplica INSERT em
 * "EvaluationCriterion" no EU (DATABASE_URL).
 *
 * Uso: node scripts/apply-json-to-eu-criterion.mjs <ficheiro>
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

function parseJsonStringContent(s, quoteIndex) {
  if (s[quoteIndex] !== '"') throw new Error("esperava '\"' no índice do valor");
  let i = quoteIndex + 1;
  let out = "";
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      i++;
      if (i >= s.length) break;
      const e = s[i];
      if (e === "n") out += "\n";
      else if (e === "r") out += "\r";
      else if (e === "t") out += "\t";
      else if (e === "u" && i + 4 < s.length) {
        out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16));
        i += 4;
      } else out += e;
      i++;
    } else if (c === '"') {
      return out;
    } else {
      out += c;
      i++;
    }
  }
  throw new Error("string JSON não terminada");
}

function extractCriterionRows(text) {
  const raw = text.trim();
  const outer = JSON.parse(raw);
  if (Array.isArray(outer) && outer[0]?.coalesce != null) {
    return JSON.parse(outer[0].coalesce);
  }
  if (Array.isArray(outer) && outer[0]?.id != null) {
    return outer;
  }
  if (typeof outer?.result === "string") {
    const s = outer.result;
    const marker = '[{"coalesce":"';
    const open = s.indexOf(marker);
    if (open === -1) throw new Error("não encontrei [{\"coalesce\":\" no result");
    const quoteIdx = open + marker.length - 1;
    const jsonText = parseJsonStringContent(s, quoteIdx);
    return JSON.parse(jsonText);
  }
  throw new Error("formato de ficheiro não reconhecido");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL em falta.");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/apply-json-to-eu-criterion.mjs <ficheiro>");
  process.exit(1);
}

const text = fs.readFileSync(path.resolve(file), "utf8");
let arr;
try {
  arr = extractCriterionRows(text);
} catch (e) {
  console.error("Parse falhou:", e.message);
  process.exit(1);
}

if (!Array.isArray(arr) || arr.length === 0) {
  console.log("Array vazio — nada a fazer.");
  process.exit(0);
}

const jsonText = JSON.stringify(arr);
const sql = `
INSERT INTO "EvaluationCriterion" (id, "componentId", label, description, "sortOrder", "createdAt")
SELECT x.id, x."componentId", x.label, x.description, x."sortOrder", x."createdAt"::timestamptz
FROM jsonb_to_recordset($json$${jsonText}$json$::jsonb) AS x(
  id text,
  "componentId" text,
  label text,
  description text,
  "sortOrder" integer,
  "createdAt" text
)
ON CONFLICT (id) DO NOTHING;
`;

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log(`OK: ${arr.length} linhas (EvaluationCriterion).`);
} finally {
  await client.end();
}
