import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Revolut Merchant API (pagamentos online e subscrições). Independente da Business API de leitura (lib/revolut/*).
 * Cada pedido recebe a conta da escola (lib/revolut/merchant-accounts.ts).
 * Variáveis da conta da Sede: REVOLUT_MERCHANT_SECRET_KEY, REVOLUT_MERCHANT_WEBHOOK_SECRET (+ as mesmas com sufixo _SANDBOX).
 */
const API_VERSION = "2026-08-17";

// Automático: só o deploy de produção da Vercel usa as chaves reais; Preview, desenvolvimento e local usam as
// variáveis com sufixo _SANDBOX. Não há interruptor manual (um valor esquecido não pode ligar o ambiente errado).
const SANDBOX = process.env.VERCEL_ENV !== "production";
const pick = (name: string) => (SANDBOX ? process.env[`${name}_SANDBOX`] : process.env[name])?.trim() ?? "";
const SECRET_KEY = pick("REVOLUT_MERCHANT_SECRET_KEY");
const WEBHOOK_SECRET = pick("REVOLUT_MERCHANT_WEBHOOK_SECRET");
const BASE_URL = SANDBOX ? "https://sandbox-merchant.revolut.com" : "https://merchant.revolut.com";

export type MerchantAccount = { secretKey: string; webhookSecret: string };

/** Conta da Sede, nas variáveis de ambiente. */
export const sedeMerchantAccount: MerchantAccount | null = SECRET_KEY ? { secretKey: SECRET_KEY, webhookSecret: WEBHOOK_SECRET } : null;

export const revolutMerchantConfigured = SECRET_KEY.length > 0;
export const revolutMerchantWebhookConfigured = WEBHOOK_SECRET.length > 0;
/** Diagnóstico sem revelar o segredo: início do SHA-256 do segredo do webhook em uso (para comparar com o .env). */
export function webhookSecretFingerprint(): string | null {
  return WEBHOOK_SECRET ? createHash("sha256").update(WEBHOOK_SECRET).digest("hex").slice(0, 10) : null;
}
/** Ambiente das chaves em uso (guardado com planos/subscrições para não misturar sandbox e produção). */
export const revolutMerchantEnv: "sandbox" | "prod" = SANDBOX ? "sandbox" : "prod";

export type MerchantPaymentMethod = {
  type?: string;
  card_brand?: string;
  card_last_four?: string;
  brand?: string;
  last_four?: string;
};

export type MerchantOrder = {
  id: string;
  state: string;
  type?: string;
  /** Em cêntimos. */
  amount: number;
  currency: string;
  checkout_url?: string;
  created_at?: string;
  merchant_order_data?: { reference?: string | null } | null;
  customer?: { id?: string | null; email?: string | null } | null;
  payments?: { id: string; state: string; payment_method?: MerchantPaymentMethod | null }[];
};

export class MerchantApiError extends Error {
  constructor(
    readonly status: number,
    body: string
  ) {
    super(`Revolut Merchant ${status}: ${body.slice(0, 300)}`);
  }
}

async function call<T>(account: MerchantAccount, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${account.secretKey}`,
      "Revolut-Api-Version": API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new MerchantApiError(res.status, await res.text());
  // Comandos de subscrição (cancel, change-plan, change-renewal-date) respondem 204 sem corpo.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Cria uma ordem e devolve o link de checkout hospedado pela Revolut. `reference` = id da nossa encomenda. */
export function createMerchantOrder(account: MerchantAccount, input: { amountEur: number; description: string; reference: string; redirectUrl: string; email?: string | null; fullName?: string | null }) {
  const customer = { ...(input.email ? { email: input.email } : {}), ...(input.fullName ? { full_name: input.fullName } : {}) };
  return call<MerchantOrder>(account, "/api/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(input.amountEur * 100),
      currency: "EUR",
      description: input.description,
      redirect_url: input.redirectUrl,
      merchant_order_data: { reference: input.reference },
      ...(Object.keys(customer).length ? { customer } : {}),
    }),
  });
}

export function getMerchantOrder(account: MerchantAccount, orderId: string) {
  return call<MerchantOrder>(account, `/api/orders/${encodeURIComponent(orderId)}`);
}

/** «Visa ••4242», «Revolut Pay», «Apple Pay»… a partir do último pagamento concluído da ordem. */
export function paymentMethodLabel(order: MerchantOrder): string | null {
  const payments = order.payments ?? [];
  const p = [...payments].reverse().find((x) => x.state === "completed" || x.state === "captured") ?? payments[0];
  const m = p?.payment_method;
  if (!m) return null;
  const brand = m.card_brand ?? m.brand;
  const last4 = m.card_last_four ?? m.last_four;
  const type = (m.type ?? "").toLowerCase();
  const typeLabel = type === "revolut_pay" ? "Revolut Pay" : type === "apple_pay" ? "Apple Pay" : type === "google_pay" ? "Google Pay" : null;
  if (brand && last4) return `${brand.charAt(0).toUpperCase()}${brand.slice(1).toLowerCase()} ••${last4}${typeLabel ? ` (${typeLabel})` : ""}`;
  return typeLabel ?? (type ? "Cartão" : null);
}

// ---------- Clientes e subscrições ----------

export type MerchantCustomer = { id: string; email?: string | null; full_name?: string | null };

export function createMerchantCustomer(account: MerchantAccount, input: { fullName: string; email?: string | null }) {
  return call<MerchantCustomer>(account, "/api/customers", {
    method: "POST",
    body: JSON.stringify({ full_name: input.fullName, ...(input.email ? { email: input.email } : {}) }),
  });
}

export type MerchantSubscriptionPlan = { id: string; variations: { id: string; phases: { cycle_duration: string; amount: number }[] }[] };

/** Plano mensal com um único valor (uma variação, uma fase, sem fim). */
export function createMonthlySubscriptionPlan(account: MerchantAccount, input: { name: string; amountCents: number }) {
  return call<MerchantSubscriptionPlan>(account, "/api/subscription-plans", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      variations: [{ phases: [{ ordinal: 1, cycle_duration: "P1M", amount: input.amountCents, currency: "EUR" }] }],
    }),
  });
}

export type MerchantSubscription = {
  id: string;
  state: string;
  external_reference?: string | null;
  customer_id: string;
  plan_variation_id: string;
  payment_method_id?: string | null;
  start_date?: string | null;
  current_cycle_id?: string | null;
  setup_order_id?: string | null;
};

/** Fluxo «Hosted Payment Page»: a subscrição nasce pendente com uma ordem de adesão (1.ª cobrança + guarda o método). */
export function createMerchantSubscription(account: MerchantAccount, input: { planVariationId: string; customerId: string; externalReference: string; redirectUrl: string; idempotencyKey: string }) {
  return call<MerchantSubscription>(account, "/api/subscriptions", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      plan_variation_id: input.planVariationId,
      customer_id: input.customerId,
      external_reference: input.externalReference,
      setup_order_redirect_url: input.redirectUrl,
    }),
  });
}

export function getMerchantSubscription(account: MerchantAccount, id: string) {
  return call<MerchantSubscription>(account, `/api/subscriptions/${encodeURIComponent(id)}`);
}

export type MerchantSubscriptionCycle = {
  id: string;
  number: number;
  state: string;
  start_date: string;
  end_date: string;
  order_id?: string | null;
  trial?: boolean;
};

export async function listMerchantSubscriptionCycles(account: MerchantAccount, id: string): Promise<MerchantSubscriptionCycle[]> {
  const r = await call<{ cycles?: MerchantSubscriptionCycle[] } | undefined>(account, `/api/subscriptions/${encodeURIComponent(id)}/cycles?limit=100`);
  return r?.cycles ?? [];
}

/** Muda a próxima data de cobrança (fim do ciclo atual). */
export function changeMerchantSubscriptionRenewalDate(account: MerchantAccount, id: string, renewalDate: Date) {
  return call<void>(account, `/api/subscriptions/${encodeURIComponent(id)}/change-renewal-date`, {
    method: "POST",
    body: JSON.stringify({ renewal_date: renewalDate.toISOString() }),
  });
}

/** Novo valor a partir do próximo ciclo. */
export function changeMerchantSubscriptionPlan(account: MerchantAccount, id: string, planVariationId: string) {
  return call<void>(account, `/api/subscriptions/${encodeURIComponent(id)}/change-plan`, {
    method: "POST",
    body: JSON.stringify({ plan_variation_id: planVariationId, scheduled: "at_cycle_end" }),
  });
}

export function cancelMerchantSubscription(account: MerchantAccount, id: string) {
  return call<void>(account, `/api/subscriptions/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

// ---------- Webhook ----------

// Loja e mensalidades (ORDER_COMPLETED) + pagamento automático (subscrições). Os mesmos de scripts/revolut-registar-webhook.mjs.
const WEBHOOK_EVENTS = ["ORDER_COMPLETED", "SUBSCRIPTION_INITIATED", "SUBSCRIPTION_OVERDUE", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_FINISHED"];

type MerchantWebhook = { id: string; url: string; events?: string[]; signing_secret?: string };

/** Regista o webhook nesta conta (ou completa o que já existe para o URL) e devolve o signing secret. Serve também para testar a chave. */
export async function ensureMerchantWebhook(secretKey: string, url: string): Promise<string> {
  const account: MerchantAccount = { secretKey, webhookSecret: "" };
  // Conforme a versão da API, a listagem vem como lista ou dentro de um objeto.
  const listed = await call<MerchantWebhook[] | { webhooks?: MerchantWebhook[]; data?: MerchantWebhook[]; items?: MerchantWebhook[] }>(account, "/api/webhooks");
  const list = Array.isArray(listed) ? listed : (listed?.webhooks ?? listed?.data ?? listed?.items ?? []);
  const found = list.find((w) => w.url === url);

  let webhook: MerchantWebhook;
  if (found) {
    // O detalhe traz os eventos e o signing_secret (a listagem pode não os trazer).
    webhook = await call<MerchantWebhook>(account, `/api/webhooks/${encodeURIComponent(found.id)}`);
    if (WEBHOOK_EVENTS.some((e) => !(webhook.events ?? []).includes(e))) {
      await call<unknown>(account, `/api/webhooks/${encodeURIComponent(found.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ url, events: [...new Set([...(webhook.events ?? []), ...WEBHOOK_EVENTS])] }),
      });
    }
  } else {
    webhook = await call<MerchantWebhook>(account, "/api/webhooks", { method: "POST", body: JSON.stringify({ url, events: WEBHOOK_EVENTS }) });
  }
  if (!webhook.signing_secret) throw new Error("Revolut Merchant: webhook sem signing secret");
  return webhook.signing_secret;
}

/** Assinatura do webhook: `v1=` + HMAC-SHA256 de `v1.{timestamp}.{corpo}` (pode vir mais de uma, separadas por vírgula). */
export function verifyMerchantWebhook(account: MerchantAccount, rawBody: string, signatureHeader: string | null, timestamp: string | null): boolean {
  if (!account.webhookSecret || !signatureHeader || !timestamp) return false;
  // As ordens enviam milissegundos; os exemplos das subscrições vêm em segundos.
  const ts = Number(timestamp);
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const age = Math.abs(Date.now() - ms);
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", account.webhookSecret).update(`v1.${timestamp}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(`v1=${expected}`);
  return signatureHeader.split(",").some((s) => {
    const buf = Buffer.from(s.trim());
    return buf.length === expectedBuf.length && timingSafeEqual(buf, expectedBuf);
  });
}
