import "server-only";
import { createPrivateKey } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptPaymentSecret, encryptPaymentSecret, paymentSecretsConfigured } from "@/lib/payment-secrets";
import { getRevolutConfig, revolutConfigFrom, type RevolutConfig } from "@/lib/revolut/client";
import { revolutMerchantEnv } from "@/lib/revolut/merchant";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";

/**
 * Ligação de cada escola à sua conta Revolut Business (só leitura de movimentos).
 * A Sede tem o certificado nas variáveis de ambiente; as outras, em `SchoolPaymentSecret`.
 * O refresh token vai cifrado em `RevolutConnection`, para todas as escolas.
 */

const CERT_KIND = "REVOLUT_BUSINESS_CERT";
const TOKEN_KIND = "REVOLUT_BUSINESS_REFRESH_TOKEN";

export const revolutCallbackUrl = (origin: string) => `${origin}/api/revolut/callback`;

const tokenScope = (schoolId: string) => ({ schoolId, kind: TOKEN_KIND, environment: revolutMerchantEnv });
const certScope = (schoolId: string) => ({ schoolId, kind: CERT_KIND, environment: revolutMerchantEnv });

export async function resolveBankConfig(supabase: SupabaseClient, schoolId: string): Promise<RevolutConfig | null> {
  if (schoolId === SEDE_SCHOOL_ID) return getRevolutConfig();
  const { data } = await supabase.from("SchoolPaymentSecret").select("ciphertext").eq("schoolId", schoolId).eq("environment", revolutMerchantEnv).eq("kind", CERT_KIND).maybeSingle();
  const stored = (data as { ciphertext: string } | null)?.ciphertext;
  if (!stored) return null;
  try {
    return revolutConfigFrom(JSON.parse(decryptPaymentSecret(stored, certScope(schoolId))), revolutMerchantEnv === "sandbox");
  } catch (e) {
    console.error("[bank-accounts] decifrar", schoolId, e instanceof Error ? e.message : e);
    return null;
  }
}

export type BankConnection = { schoolId: string; refreshToken: string; connectedByUserId: string | null; connectedAt: string; lastSyncAt: string | null; lastSyncError: string | null };

const CONNECTION_COLUMNS = "schoolId, refreshToken, connectedByUserId, connectedAt, lastSyncAt, lastSyncError";

/** O `refreshToken` devolvido continua cifrado: decifra-se só para o usar (`decryptBankRefreshToken`). */
export async function loadBankConnection(supabase: SupabaseClient, schoolId: string): Promise<BankConnection | null> {
  const { data } = await supabase.from("RevolutConnection").select(CONNECTION_COLUMNS).eq("schoolId", schoolId).eq("environment", revolutMerchantEnv).maybeSingle();
  return data as unknown as BankConnection | null;
}

export async function loadBankConnections(supabase: SupabaseClient): Promise<BankConnection[]> {
  const { data } = await supabase.from("RevolutConnection").select(CONNECTION_COLUMNS).eq("environment", revolutMerchantEnv);
  return (data ?? []) as unknown as BankConnection[];
}

export const decryptBankRefreshToken = (connection: BankConnection) => decryptPaymentSecret(connection.refreshToken, tokenScope(connection.schoolId));

export const updateBankConnection = (supabase: SupabaseClient, schoolId: string, patch: { lastSyncAt?: string; lastSyncError: string | null }) =>
  supabase.from("RevolutConnection").update(patch).eq("schoolId", schoolId).eq("environment", revolutMerchantEnv);

/** Autorização concluída na Revolut. */
export async function saveBankConnection(supabase: SupabaseClient, input: { schoolId: string; refreshToken: string; actorUserId: string }): Promise<{ error?: string }> {
  const { error } = await supabase.from("RevolutConnection").upsert(
    {
      id: `${input.schoolId}:${revolutMerchantEnv}`,
      schoolId: input.schoolId,
      environment: revolutMerchantEnv,
      refreshToken: encryptPaymentSecret(input.refreshToken, tokenScope(input.schoolId)),
      connectedByUserId: input.actorUserId,
      connectedAt: new Date().toISOString(),
      lastSyncError: null,
    },
    { onConflict: "id" }
  );
  return error ? { error: error.message } : {};
}

export type SchoolBankStatus = {
  isSede: boolean;
  certificateSaved: boolean;
  clientIdEnd: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  callbackUrl: string;
};

export async function loadSchoolBankStatus(supabase: SupabaseClient, schoolId: string, origin: string): Promise<SchoolBankStatus> {
  const [{ data: cert }, connection] = await Promise.all([
    supabase.from("SchoolPaymentSecret").select("last4").eq("schoolId", schoolId).eq("environment", revolutMerchantEnv).eq("kind", CERT_KIND).maybeSingle(),
    loadBankConnection(supabase, schoolId),
  ]);
  return {
    isSede: schoolId === SEDE_SCHOOL_ID,
    certificateSaved: Boolean(cert),
    clientIdEnd: (cert as { last4: string | null } | null)?.last4 ?? null,
    connectedAt: connection?.connectedAt ?? null,
    lastSyncAt: connection?.lastSyncAt ?? null,
    lastSyncError: connection?.lastSyncError ?? null,
    callbackUrl: revolutCallbackUrl(origin),
  };
}

/** Guarda o certificado. Um certificado novo pede nova autorização: o token antigo só vale com o ClientID antigo. */
export async function saveSchoolBankCertificate(
  supabase: SupabaseClient,
  input: { schoolId: string; clientId: string; privateKey: string; origin: string; actorUserId: string | null }
): Promise<{ error?: string }> {
  const { schoolId, clientId, origin, actorUserId } = input;
  if (schoolId === SEDE_SCHOOL_ID) return { error: "A Sede usa o certificado configurado no servidor." };
  if (!paymentSecretsConfigured(revolutMerchantEnv)) return { error: "Falta a chave de cifra dos pagamentos no servidor." };
  if (!origin.startsWith("https://")) return { error: "A ligação tem de ser feita num endereço público (https). Em testes, usa um Preview." };
  const privateKey = input.privateKey.replace(/\\n/g, "\n").trim();
  try {
    createPrivateKey(privateKey);
  } catch {
    return { error: "Isto não é uma chave privada válida. Cola o conteúdo completo de privatecert.pem." };
  }

  const certificate = JSON.stringify({ clientId, privateKey, redirectUri: revolutCallbackUrl(origin) });
  const { error } = await supabase.from("SchoolPaymentSecret").upsert(
    {
      schoolId,
      kind: CERT_KIND,
      environment: revolutMerchantEnv,
      ciphertext: encryptPaymentSecret(certificate, certScope(schoolId)),
      last4: clientId.slice(-4),
      updatedByUserId: actorUserId,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "schoolId,kind,environment" }
  );
  if (error) return { error: error.message };
  const { error: connectionError } = await supabase.from("RevolutConnection").delete().eq("schoolId", schoolId).eq("environment", revolutMerchantEnv);
  return connectionError ? { error: connectionError.message } : {};
}

/** As transferências já lidas ficam; deixam só de entrar novas. */
export async function disconnectSchoolBank(supabase: SupabaseClient, schoolId: string): Promise<{ error?: string }> {
  if (schoolId === SEDE_SCHOOL_ID) return { error: "A Sede usa o certificado configurado no servidor." };
  const { error } = await supabase.from("RevolutConnection").delete().eq("schoolId", schoolId).eq("environment", revolutMerchantEnv);
  if (error) return { error: error.message };
  const { error: certError } = await supabase.from("SchoolPaymentSecret").delete().eq("schoolId", schoolId).eq("environment", revolutMerchantEnv).eq("kind", CERT_KIND);
  return certError ? { error: certError.message } : {};
}
