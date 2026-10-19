import "server-only";
import { createSign } from "node:crypto";

/**
 * Cliente mínimo da Revolut Business API (só leitura de movimentos).
 * Autenticação: JWT (client assertion) assinado com a chave privada do certificado carregado na Revolut,
 * troca do código de autorização por refresh token (não expira) e access tokens de 40 minutos.
 *
 * Variáveis de ambiente (Vercel):
 * - REVOLUT_CLIENT_ID      — «ClientID» do certificado em Revolut Business → APIs → Business API
 * - REVOLUT_PRIVATE_KEY    — conteúdo de privatecert.pem (as quebras de linha podem vir como \n)
 * - REVOLUT_REDIRECT_URI   — ex.: https://www.kingdomfight.com/api/revolut/callback (igual ao configurado na Revolut)
 * - REVOLUT_ENV            — "sandbox" ou "production" (por omissão: production)
 */

export type RevolutConfig = { clientId: string; privateKey: string; redirectUri: string; apiBase: string; consentBase: string };

export function getRevolutConfig(): RevolutConfig | null {
  const clientId = process.env.REVOLUT_CLIENT_ID?.trim();
  const privateKey = process.env.REVOLUT_PRIVATE_KEY?.replace(/\n/g, "\n").trim();
  const redirectUri = process.env.REVOLUT_REDIRECT_URI?.trim();
  if (!clientId || !privateKey || !redirectUri) return null;
  const sandbox = process.env.REVOLUT_ENV?.trim().toLowerCase() === "sandbox";
  return {
    clientId,
    privateKey,
    redirectUri,
    apiBase: sandbox ? "https://sandbox-b2b.revolut.com/api/1.0" : "https://b2b.revolut.com/api/1.0",
    consentBase: sandbox ? "https://sandbox-business.revolut.com" : "https://business.revolut.com",
  };
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function clientAssertion(cfg: RevolutConfig): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: new URL(cfg.redirectUri).host,
      sub: cfg.clientId,
      aud: "https://revolut.com",
      exp: Math.floor(Date.now() / 1000) + 300,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${b64url(signer.sign(cfg.privateKey))}`;
}

/** URL para o admin autorizar o acesso (só leitura) na Revolut Business. */
export function revolutConsentUrl(cfg: RevolutConfig, state: string): string {
  const u = new URL("/app-confirm", cfg.consentBase);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "READ");
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(cfg: RevolutConfig, body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${cfg.apiBase}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...body,
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientAssertion(cfg),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Revolut auth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as TokenResponse;
}

export function exchangeAuthorizationCode(cfg: RevolutConfig, code: string) {
  return tokenRequest(cfg, { grant_type: "authorization_code", code });
}

export function refreshAccessToken(cfg: RevolutConfig, refreshToken: string) {
  return tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: refreshToken });
}

export type RevolutTransaction = {
  id: string;
  type: string;
  state: string;
  created_at: string;
  completed_at?: string;
  reference?: string;
  legs: { leg_id: string; account_id: string; amount: number; currency: string; description?: string; counterparty?: { account_type?: string; account_id?: string } }[];
};

/** Movimentos desde `from` (ISO), do mais recente para o mais antigo (máx. 1000 por pedido). */
export async function listTransactions(cfg: RevolutConfig, accessToken: string, from: string): Promise<RevolutTransaction[]> {
  const u = new URL(`${cfg.apiBase}/transactions`);
  u.searchParams.set("from", from);
  u.searchParams.set("count", "1000");
  const res = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Revolut transactions ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as RevolutTransaction[];
}
