// Regista (uma só vez) o webhook da Revolut Merchant API e mostra o signing secret.
// Lê REVOLUT_MERCHANT_SECRET_KEY e REVOLUT_MERCHANT_ENV do .env. Corre-o tu: node scripts/revolut-registar-webhook.mjs
// Opcional: passar outro URL como argumento (ex.: um URL de teste).
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const sandbox = process.env.REVOLUT_MERCHANT_ENV?.trim() === "sandbox";
const keyName = sandbox ? "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX" : "REVOLUT_MERCHANT_SECRET_KEY";
const key = process.env[keyName]?.trim();
if (!key) {
  console.error(`Falta ${keyName} no .env`);
  process.exit(1);
}
console.log(`Ambiente: ${sandbox ? "SANDBOX" : "PRODUÇÃO"}`);
const base = sandbox ? "https://sandbox-merchant.revolut.com" : "https://merchant.revolut.com";
const url = process.argv[2] ?? "https://www.kingdomfight.com/api/revolut/merchant-webhook";

const headers = { Authorization: `Bearer ${key}`, "Revolut-Api-Version": "2026-08-17", "Content-Type": "application/json" };

const existing = await fetch(`${base}/api/webhooks`, { headers });
if (existing.ok) {
  const list = await existing.json();
  const dup = (Array.isArray(list) ? list : []).find((w) => w.url === url);
  if (dup) {
    console.log(`Já existe um webhook para ${url} (id ${dup.id}).`);
    console.log(`signing_secret: ${dup.signing_secret}`);
    process.exit(0);
  }
}

const res = await fetch(`${base}/api/webhooks`, { method: "POST", headers, body: JSON.stringify({ url, events: ["ORDER_COMPLETED"] }) });
const body = await res.text();
if (!res.ok) {
  console.error(`Erro ${res.status}: ${body}`);
  process.exit(1);
}
const w = JSON.parse(body);
console.log(`Webhook criado (id ${w.id}) para ${w.url}`);
console.log(`signing_secret: ${w.signing_secret}`);
console.log("Põe este valor em REVOLUT_MERCHANT_WEBHOOK_SECRET (.env e Vercel) e faz redeploy.");
