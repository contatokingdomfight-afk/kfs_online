// Regista (uma só vez) o webhook da Revolut Merchant API e mostra o signing secret.
// Lê REVOLUT_MERCHANT_SECRET_KEY_SANDBOX (ou REVOLUT_MERCHANT_SECRET_KEY com --prod) do .env. Corre-o tu.
// Opcional: passar o URL do webhook como argumento (ex.: o de um Preview).
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

// Por omissão Sandbox; para registar o webhook real passa --prod (ex.: node scripts/revolut-registar-webhook.mjs --prod).
const args = process.argv.slice(2);
const sandbox = !args.includes("--prod");
const keyName = sandbox ? "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX" : "REVOLUT_MERCHANT_SECRET_KEY";
const key = process.env[keyName]?.trim();
if (!key) {
  console.error(`Falta ${keyName} no .env`);
  process.exit(1);
}
console.log(`Ambiente: ${sandbox ? "SANDBOX" : "PRODUÇÃO"}`);
const base = sandbox ? "https://sandbox-merchant.revolut.com" : "https://merchant.revolut.com";
const url = args.find((a) => a.startsWith("http")) ?? "https://www.kingdomfight.com/api/revolut/merchant-webhook";

const headers = { Authorization: `Bearer ${key}`, "Revolut-Api-Version": "2026-08-17", "Content-Type": "application/json" };
// Loja (ORDER_COMPLETED) + pagamento automático da mensalidade (subscrições).
const EVENTS = ["ORDER_COMPLETED", "SUBSCRIPTION_INITIATED", "SUBSCRIPTION_OVERDUE", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_FINISHED"];

const existing = await fetch(`${base}/api/webhooks`, { headers });
if (existing.ok) {
  const json = await existing.json();
  // Conforme a versão da API, a listagem vem como lista ou dentro de um objeto.
  const list = Array.isArray(json) ? json : json?.webhooks ?? json?.data ?? json?.items ?? [];
  const found = list.find((w) => w.url === url);
  // O detalhe traz os eventos e o signing_secret (a listagem pode não os trazer).
  const dup = found ? { ...found, ...(await (await fetch(`${base}/api/webhooks/${found.id}`, { headers })).json().catch(() => ({}))) } : null;
  if (dup) {
    console.log(`Já existe um webhook para ${url} (id ${dup.id}).`);
    const missing = EVENTS.filter((e) => !(dup.events ?? []).includes(e));
    if (missing.length) {
      const upd = await fetch(`${base}/api/webhooks/${dup.id}`, { method: "PATCH", headers, body: JSON.stringify({ events: [...new Set([...(dup.events ?? []), ...EVENTS])] }) });
      console.log(upd.ok ? `Eventos acrescentados: ${missing.join(", ")}` : `Erro ao acrescentar eventos ${upd.status}: ${await upd.text()}`);
    } else {
      console.log("Já tem todos os eventos.");
    }
    console.log(`signing_secret: ${dup.signing_secret}`);
    process.exit(0);
  }
}

const res = await fetch(`${base}/api/webhooks`, { method: "POST", headers, body: JSON.stringify({ url, events: EVENTS }) });
const body = await res.text();
if (!res.ok) {
  console.error(`Erro ${res.status}: ${body}`);
  process.exit(1);
}
const w = JSON.parse(body);
console.log(`Webhook criado (id ${w.id}) para ${w.url}`);
console.log(`signing_secret: ${w.signing_secret}`);
console.log("Põe este valor em REVOLUT_MERCHANT_WEBHOOK_SECRET (.env e Vercel) e faz redeploy.");
