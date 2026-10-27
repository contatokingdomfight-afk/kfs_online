// Apaga deployments da Vercel com mais de N dias (por defeito 2). Mantém o deploy de produção atual.
// Uso:  node scripts/vercel-limpar-deploys.mjs          -> simulação (só lista)
//       node scripts/vercel-limpar-deploys.mjs --apagar -> apaga mesmo
// Requer `npx vercel login` feito (usa o token da CLI) ou VERCEL_TOKEN.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT = "kfs-sistema";
const TEAM_SLUG = "contatokingdomfight-afks-projects";
const DIAS = Number(process.env.DIAS ?? 2);
const APAGAR = process.argv.includes("--apagar");

function token() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const candidatos = [
    path.join(process.env.APPDATA ?? "", "com.vercel.cli", "Data", "auth.json"),
    path.join(os.homedir(), ".local", "share", "com.vercel.cli", "auth.json"),
    path.join(os.homedir(), "Library", "Application Support", "com.vercel.cli", "auth.json"),
  ];
  for (const f of candidatos) {
    try {
      return JSON.parse(fs.readFileSync(f, "utf8")).token;
    } catch {}
  }
  throw new Error("Sem token: corra `npx vercel login` ou defina VERCEL_TOKEN.");
}

const TOKEN = token();
const H = { Authorization: `Bearer ${TOKEN}` };
const q = `slug=${TEAM_SLUG}`;

async function api(p, opts = {}) {
  const sep = p.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.vercel.com${p}${sep}${q}`, { headers: H, ...opts });
  if (!r.ok) throw new Error(`${r.status} ${p}: ${await r.text()}`);
  return r.json();
}

const projeto = await api(`/v9/projects/${PROJECT}`);
const prodAtual = projeto.targets?.production?.id;
const limite = Date.now() - DIAS * 24 * 3600 * 1000;

const alvo = [];
let until;
for (;;) {
  const r = await api(`/v6/deployments?projectId=${projeto.id}&limit=100${until ? `&until=${until}` : ""}`);
  for (const d of r.deployments) {
    if (d.created < limite && d.uid !== prodAtual) alvo.push(d);
  }
  if (!r.pagination?.next) break;
  until = r.pagination.next;
}

console.log(`Produção atual (mantida): ${prodAtual}`);
console.log(`${alvo.length} deployments com mais de ${DIAS} dias${APAGAR ? " — a apagar" : " (simulação)"}`);
let ok = 0;
for (const d of alvo) {
  const data = new Date(d.created).toISOString().slice(0, 16).replace("T", " ");
  if (!APAGAR) {
    console.log(`  ${data}  ${d.target ?? "preview"}  ${d.url}`);
    continue;
  }
  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    try {
      await api(`/v13/deployments/${d.uid}`, { method: "DELETE" });
      ok++;
      console.log(`apagado ${data} ${d.url}`);
      break;
    } catch (e) {
      if (e.message.startsWith("429") && tentativa < 5) {
        await new Promise((r) => setTimeout(r, 5000 * tentativa));
        continue;
      }
      console.log(`falhou ${d.url}: ${e.message.slice(0, 120)}`);
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));
}
if (APAGAR) console.log(`Concluído: ${ok}/${alvo.length} apagados.`);
else console.log("Nada foi apagado. Corra com --apagar para apagar.");
