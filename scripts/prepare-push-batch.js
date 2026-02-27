/**
 * Gera um batch de ficheiros para push_files (MCP).
 * Uso: node scripts/prepare-push-batch.js <batch_number>
 * Exclui ficheiros já no repo (config + DOCS do batch 0).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const BATCH_SIZE = 1;
const ALREADY_PUSHED = new Set([
  "README.md", ".gitignore", ".env.example", "package.json", "next.config.mjs",
  "tsconfig.json", "vercel.json",
  "DOCS/DESIGN SYSTEM - TOKENS OFICIAIS.md", "DOCS/Deploy_Vercel_kingdomfight.md",
  "DOCS/Especificacao_Plataforma_Kingdom_Digital.md", "DOCS/Login_Google_Producao_Hostinger.md",
  "DOCS/Login_Google_Supabase.md",
]);

function unquoteGitPath(line) {
  let p = line.trim();
  if (!p.startsWith('"') || !p.endsWith('"')) return p;
  p = p.slice(1, -1);
  const bytes = [];
  let decoded = "";
  for (let i = 0; i < p.length; ) {
    if (p[i] === "\\" && p.slice(i + 1, i + 4).match(/^[0-7]{3}$/)) {
      bytes.push(parseInt(p.slice(i + 1, i + 4), 8));
      i += 4;
    } else {
      if (bytes.length) {
        decoded += Buffer.from(bytes).toString("utf8");
        bytes.length = 0;
      }
      decoded += p[i];
      i++;
    }
  }
  if (bytes.length) decoded += Buffer.from(bytes).toString("utf8");
  return decoded;
}

function parseGitPaths(stdout) {
  const lines = stdout.split(/\r?\n/).filter((s) => s.trim());
  return lines.map((line) => unquoteGitPath(line));
}

let allPaths;
try {
  const out = execSync("git ls-files", { cwd: root, encoding: "utf8" });
  allPaths = parseGitPaths(out).filter((p) => !ALREADY_PUSHED.has(p));
} catch (e) {
  console.error("git ls-files failed", e.message);
  process.exit(1);
}

const batchNum = parseInt(process.argv[2] || "0", 10);
const start = batchNum * BATCH_SIZE;
const slice = allPaths.slice(start, start + BATCH_SIZE);

const files = [];
for (const f of slice) {
  const full = path.join(root, f);
  if (!fs.existsSync(full)) continue;
  const ext = path.extname(f).toLowerCase();
  if (ext === ".docx" || ext === ".pdf") continue; // binary
  try {
    const content = fs.readFileSync(full, "utf8");
    files.push({ path: f, content });
  } catch (err) {
    // skip binary or unreadable
  }
}

const payload = {
  owner: "OseiasBeu",
  repo: "kfs_system",
  branch: "main",
  message: `KFS batch ${batchNum + 2} - ${files.length} files`,
  files,
};

fs.writeFileSync(path.join(__dirname, "push-batch.json"), JSON.stringify(payload));
console.log(`Batch ${batchNum}: ${files.length} files (total to push: ${allPaths.length}, next start: ${start + slice.length})`);
