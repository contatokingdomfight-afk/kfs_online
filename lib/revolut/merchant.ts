import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Revolut Merchant API (pagamentos online). Independente da Business API de leitura (lib/revolut/*).
 * Variáveis: REVOLUT_MERCHANT_ENV (sandbox|prod), REVOLUT_MERCHANT_SECRET_KEY, REVOLUT_MERCHANT_WEBHOOK_SECRET.
 */
const API_VERSION = "2026-08-17";

// Com REVOLUT_MERCHANT_ENV=sandbox usam-se as variáveis com sufixo _SANDBOX (as de produção ficam intactas).
const SANDBOX = process.env.REVOLUT_MERCHANT_ENV?.trim() === "sandbox";
const pick = (name: string) => (SANDBOX ? process.env[`${name}_SANDBOX`] : process.env[name])?.trim() ?? "";
const SECRET_KEY = pick("REVOLUT_MERCHANT_SECRET_KEY");
const WEBHOOK_SECRET = pick("REVOLUT_MERCHANT_WEBHOOK_SECRET");
const BASE_URL = SANDBOX ? "https://sandbox-merchant.revolut.com" : "https://merchant.revolut.com";

export const revolutMerchantConfigured = SECRET_KEY.length > 0;
export const revolutMerchantWebhookConfigured = WEBHOOK_SECRET.length > 0;

export type MerchantOrder = {
  id: string;
  state: string;
  type?: string;
  /** Em cêntimos. */
  amount: number;
  currency: string;
  checkout_url?: string;
  merchant_order_data?: { reference?: string | null } | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Revolut-Api-Version": API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Revolut Merchant ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** Cria uma ordem e devolve o link de checkout hospedado pela Revolut. `reference` = id da nossa encomenda. */
export function createMerchantOrder(input: { amountEur: number; description: string; reference: string; redirectUrl: string; email?: string | null }) {
  return call<MerchantOrder>("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(input.amountEur * 100),
      currency: "EUR",
      description: input.description,
      redirect_url: input.redirectUrl,
      merchant_order_data: { reference: input.reference },
      ...(input.email ? { customer: { email: input.email } } : {}),
    }),
  });
}

export function getMerchantOrder(orderId: string) {
  return call<MerchantOrder>(`/api/orders/${encodeURIComponent(orderId)}`);
}

/** Assinatura do webhook: `v1=` + HMAC-SHA256 de `v1.{timestamp}.{corpo}` (pode vir mais de uma, separadas por vírgula). */
export function verifyMerchantWebhook(rawBody: string, signatureHeader: string | null, timestamp: string | null): boolean {
  if (!WEBHOOK_SECRET || !signatureHeader || !timestamp) return false;
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(`v1.${timestamp}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(`v1=${expected}`);
  return signatureHeader.split(",").some((s) => {
    const buf = Buffer.from(s.trim());
    return buf.length === expectedBuf.length && timingSafeEqual(buf, expectedBuf);
  });
}
