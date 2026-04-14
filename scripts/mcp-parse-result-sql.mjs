/**
 * Extrai o campo `sql` de `[{"sql":"..."}]` dentro de `result` (resposta MCP Supabase).
 * Escreve SQL real (newlines) para stdout ou para ficheiro com -o.
 *
 * Uso: node scripts/mcp-parse-result-sql.mjs resposta.json [-o out.sql]
 */
import fs from "fs";
import path from "path";

const inPath = process.argv[2];
const outIdx = process.argv.indexOf("-o");
const outPath = outIdx !== -1 ? process.argv[outIdx + 1] : null;

if (!inPath) {
  console.error("Uso: node scripts/mcp-parse-result-sql.mjs <mcp.json> [-o out.sql]");
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(inPath), "utf8").trim();
const outer = JSON.parse(raw);
const text = typeof outer.result === "string" ? outer.result : raw;

const marker = '[{"sql":"';
const start = text.indexOf(marker);
if (start === -1) {
  console.error('Não encontrei [{"sql":"');
  process.exit(1);
}

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
    break;
  } else {
    out += c;
    i++;
  }
}

if (outPath) {
  fs.writeFileSync(path.resolve(outPath), out, "utf8");
  console.error(`Escrito ${outPath} (${out.length} bytes)`);
} else {
  process.stdout.write(out);
}
