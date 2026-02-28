/**
 * Envia todos os ficheiros do projeto para GitHub (OseiasBeu/kfs_system) via API.
 * Uso: GITHUB_TOKEN=teu_token node scripts/push-all-to-github.js
 * Cria o token em: GitHub → Settings → Developer settings → Personal access tokens (scope: repo)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const OWNER = "OseiasBeu";
const REPO = "kfs_system";
const BRANCH = "main";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("Define GITHUB_TOKEN: GITHUB_TOKEN=xxx node scripts/push-all-to-github.js");
  process.exit(1);
}

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
  allPaths = parseGitPaths(out);
} catch (e) {
  console.error("git ls-files failed", e.message);
  process.exit(1);
}

async function getFileSha(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (res.status !== 200) return null;
  const data = await res.json();
  return data.sha || null;
}

async function putFile(filePath, content, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}`;
  const body = {
    message: `KFS: sync ${filePath}`,
    branch: BRANCH,
    content: Buffer.from(content, "utf8").toString("base64"),
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }
  return res.json();
}

async function main() {
  const toPush = [];
  for (const f of allPaths) {
    const full = path.join(root, f);
    if (!fs.existsSync(full)) continue;
    const ext = path.extname(f).toLowerCase();
    if (ext === ".docx" || ext === ".pdf") continue;
    try {
      const content = fs.readFileSync(full, "utf8");
      toPush.push({ path: f, content });
    } catch (_) {}
  }

  console.log(`A enviar ${toPush.length} ficheiros para ${OWNER}/${REPO} (branch ${BRANCH})...`);
  let ok = 0;
  let err = 0;
  for (let i = 0; i < toPush.length; i++) {
    const { path: filePath, content } = toPush[i];
    try {
      const sha = await getFileSha(filePath);
      await putFile(filePath, content, sha);
      ok++;
      if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${toPush.length}`);
    } catch (e) {
      err++;
      console.error(`  ERRO ${filePath}:`, e.message);
    }
  }
  console.log(`Concluído: ${ok} ok, ${err} erros.`);
  if (err) process.exit(1);
}

main();
