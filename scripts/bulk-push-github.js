/**
 * Push em massa via API GitHub usando o token do MCP github_kfs.
 * Lê o token do mcp.json e envia todos os ficheiros do git ls-files.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const mcpPath = path.join(require("os").homedir(), ".cursor", "mcp.json");

// Ler token do mcp.json
let token = null;
try {
  const mcpConfig = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
  const githubKfs = mcpConfig.mcpServers?.["github_kfs"];
  if (githubKfs?.headers?.Authorization) {
    token = githubKfs.headers.Authorization.replace(/^Bearer\s+/i, "").replace(/^github_pat_/, "github_pat_");
  }
} catch (e) {
  console.error("Erro ao ler token do mcp.json:", e.message);
  process.exit(1);
}

if (!token) {
  console.error("Token não encontrado no mcp.json (github_kfs)");
  process.exit(1);
}

console.log("Token encontrado. A processar ficheiros...");

// Função para descodificar paths do git ls-files
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

// Listar ficheiros
const gitOut = execSync("git ls-files", { cwd: root, encoding: "utf8" });
const allPaths = gitOut.split(/\r?\n/).filter(s => s.trim()).map(line => unquoteGitPath(line));

console.log(`Total de ficheiros: ${allPaths.length}`);

// Enviar cada ficheiro
let ok = 0, err = 0;
async function pushFile(filePath) {
  const full = path.join(root, filePath);
  if (!fs.existsSync(full)) return;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".docx" || ext === ".pdf") return; // skip binary
  
  let content;
  try {
    content = fs.readFileSync(full, "utf8");
  } catch {
    return; // skip unreadable
  }

  const url = `https://api.github.com/repos/OseiasBeu/kfs_system/contents/${encodeURIComponent(filePath)}`;
  
  // GET para obter SHA (se existir)
  let sha = null;
  try {
    const getRes = await fetch(url + "?ref=main", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch {}

  // PUT para criar/atualizar
  const body = {
    message: `KFS: sync ${filePath}`,
    branch: "main",
    content: Buffer.from(content, "utf8").toString("base64"),
  };
  if (sha) body.sha = sha;

  try {
    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`${putRes.status} ${errText}`);
    }
    ok++;
    if (ok % 10 === 0) console.log(`  ${ok} ficheiros enviados...`);
  } catch (e) {
    err++;
    console.error(`  ERRO ${filePath}:`, e.message);
  }
}

(async () => {
  for (const f of allPaths) {
    await pushFile(f);
  }
  console.log(`\n✅ Concluído: ${ok} ok, ${err} erros.`);
  if (err) process.exit(1);
})();
