import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptPaymentSecret, encryptPaymentSecret, paymentSecretsConfigured } from "@/lib/payment-secrets";
import { ensureMerchantWebhook, MerchantApiError, revolutMerchantConfigured, revolutMerchantEnv, sedeMerchantAccount, type MerchantAccount } from "@/lib/revolut/merchant";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";

/**
 * A conta Revolut de cada escola. A Sede usa as variáveis de ambiente; as outras, `SchoolPaymentSecret`.
 * Regra de ouro: uma escola sem conta própria fica sem pagamento online; nunca recebe na conta de outra.
 */

const SECRET_KIND = "REVOLUT_MERCHANT_SECRET";
const WEBHOOK_KIND = "REVOLUT_WEBHOOK_SECRET";
const ACTIVE_AUTOPAY_STATES = ["PENDING", "ACTIVE", "OVERDUE"];

const secretScope = (schoolId: string, kind: string) => ({ schoolId, kind, environment: revolutMerchantEnv });

export async function resolveMerchantAccount(supabase: SupabaseClient, schoolId: string): Promise<MerchantAccount | null> {
  if (schoolId === SEDE_SCHOOL_ID) return sedeMerchantAccount;
  const { data, error } = await supabase
    .from("SchoolPaymentSecret")
    .select("kind, ciphertext")
    .eq("schoolId", schoolId)
    .eq("environment", revolutMerchantEnv)
    .in("kind", [SECRET_KIND, WEBHOOK_KIND]);
  if (error) {
    console.error("[merchant-accounts]", error.message);
    return null;
  }
  const rows = (data ?? []) as { kind: string; ciphertext: string }[];
  const secret = rows.find((r) => r.kind === SECRET_KIND);
  const webhook = rows.find((r) => r.kind === WEBHOOK_KIND);
  if (!secret || !webhook) return null;
  try {
    return {
      secretKey: decryptPaymentSecret(secret.ciphertext, secretScope(schoolId, SECRET_KIND)),
      webhookSecret: decryptPaymentSecret(webhook.ciphertext, secretScope(schoolId, WEBHOOK_KIND)),
    };
  } catch (e) {
    console.error("[merchant-accounts] decifrar", schoolId, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Das escolas pedidas, as que têm conta completa neste ambiente (sem decifrar nada). */
export async function schoolsWithMerchantAccount(supabase: SupabaseClient, schoolIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (revolutMerchantConfigured && schoolIds.includes(SEDE_SCHOOL_ID)) out.add(SEDE_SCHOOL_ID);
  const others = schoolIds.filter((id) => id !== SEDE_SCHOOL_ID);
  if (!others.length || !paymentSecretsConfigured(revolutMerchantEnv)) return out;
  const { data, error } = await supabase
    .from("SchoolPaymentSecret")
    .select("schoolId, kind")
    .eq("environment", revolutMerchantEnv)
    .in("schoolId", others)
    .in("kind", [SECRET_KIND, WEBHOOK_KIND]);
  if (error) {
    console.error("[merchant-accounts]", error.message);
    return out;
  }
  const rows = (data ?? []) as { schoolId: string; kind: string }[];
  for (const id of others) {
    const kinds = rows.filter((r) => r.schoolId === id).map((r) => r.kind);
    if (kinds.includes(SECRET_KIND) && kinds.includes(WEBHOOK_KIND)) out.add(id);
  }
  return out;
}

/** Nome que o aluno vê na página de pagamento e no extrato. */
export async function merchantBrandName(supabase: SupabaseClient, schoolId: string): Promise<string> {
  if (schoolId === SEDE_SCHOOL_ID) return "Kingdom Fight School";
  const { data } = await supabase.from("School").select("name").eq("id", schoolId).maybeSingle();
  return (data as { name?: string } | null)?.name ?? "PM Team";
}

async function countActiveAutoPay(supabase: SupabaseClient, schoolId: string): Promise<number> {
  const { count } = await supabase
    .from("AutoPay")
    .select("id", { count: "exact", head: true })
    .eq("schoolId", schoolId)
    .eq("environment", revolutMerchantEnv)
    .in("state", ACTIVE_AUTOPAY_STATES);
  return count ?? 0;
}

export type SchoolMerchantStatus = { isSede: boolean; connected: boolean; last4: string | null; connectedAt: string | null; activeAutoPay: number };

export async function loadSchoolMerchantStatus(supabase: SupabaseClient, schoolId: string): Promise<SchoolMerchantStatus> {
  const isSede = schoolId === SEDE_SCHOOL_ID;
  const [connected, activeAutoPay, { data }] = await Promise.all([
    schoolsWithMerchantAccount(supabase, [schoolId]),
    countActiveAutoPay(supabase, schoolId),
    supabase.from("SchoolPaymentSecret").select("last4, updatedAt").eq("schoolId", schoolId).eq("environment", revolutMerchantEnv).eq("kind", SECRET_KIND).maybeSingle(),
  ]);
  const row = data as { last4: string | null; updatedAt: string } | null;
  return { isSede, connected: connected.has(schoolId), last4: row?.last4 ?? null, connectedAt: row?.updatedAt ?? null, activeAutoPay };
}

/** Testa a chave, regista o webhook e guarda os dois valores cifrados. Com erro, nada fica guardado. */
export async function connectSchoolMerchantAccount(
  supabase: SupabaseClient,
  input: { schoolId: string; secretKey: string; origin: string; actorUserId: string | null }
): Promise<{ error?: string }> {
  const { schoolId, secretKey, origin, actorUserId } = input;
  if (schoolId === SEDE_SCHOOL_ID) return { error: "A Sede usa a conta configurada no servidor." };
  if (secretKey.startsWith("pk_")) return { error: "Essa é a chave pública. Cola a chave secreta (começa por «sk_»)." };
  if (!paymentSecretsConfigured(revolutMerchantEnv)) return { error: "Falta a chave de cifra dos pagamentos no servidor." };
  // A Revolut só envia avisos para um endereço público: em local o pagamento nunca ficaria marcado como pago.
  if (!origin.startsWith("https://")) return { error: "A ligação tem de ser feita num endereço público (https). Em testes, usa um Preview." };

  let signingSecret: string;
  try {
    signingSecret = await ensureMerchantWebhook(secretKey, `${origin}/api/revolut/merchant-webhook?school=${encodeURIComponent(schoolId)}`);
  } catch (e) {
    console.error("[merchant-accounts] ligar conta", schoolId, e instanceof Error ? e.message : e);
    const rejected = e instanceof MerchantApiError && (e.status === 401 || e.status === 403);
    return {
      error: rejected
        ? `A Revolut recusou esta chave. Confirma que copiaste a chave secreta de ${revolutMerchantEnv === "prod" ? "produção" : "sandbox"}. Nada ficou guardado.`
        : "Não foi possível falar com a Revolut. Nada ficou guardado. Tenta outra vez.",
    };
  }

  const now = new Date().toISOString();
  const row = (kind: string, value: string, last4: string | null) => ({
    schoolId,
    kind,
    environment: revolutMerchantEnv,
    ciphertext: encryptPaymentSecret(value, secretScope(schoolId, kind)),
    last4,
    updatedByUserId: actorUserId,
    updatedAt: now,
  });
  const { error } = await supabase
    .from("SchoolPaymentSecret")
    .upsert([row(SECRET_KIND, secretKey, secretKey.slice(-4)), row(WEBHOOK_KIND, signingSecret, null)], { onConflict: "schoolId,kind,environment" });
  if (error) return { error: error.message };

  const { error: settingsError } = await supabase
    .from("SchoolPaymentSettings")
    .upsert({ schoolId, revolutEnabled: true, updatedByUserId: actorUserId, updatedAt: now }, { onConflict: "schoolId" });
  return settingsError ? { error: settingsError.message } : {};
}

export async function disconnectSchoolMerchantAccount(supabase: SupabaseClient, schoolId: string, actorUserId: string | null): Promise<{ error?: string }> {
  if (schoolId === SEDE_SCHOOL_ID) return { error: "A Sede usa a conta configurada no servidor." };
  const active = await countActiveAutoPay(supabase, schoolId);
  if (active > 0) return { error: `Cancela primeiro os ${active} pagamentos automáticos: as cobranças mensais deixariam de ser registadas.` };

  const { error } = await supabase.from("SchoolPaymentSecret").delete().eq("schoolId", schoolId).eq("environment", revolutMerchantEnv).in("kind", [SECRET_KIND, WEBHOOK_KIND]);
  if (error) return { error: error.message };

  // O interruptor é um só para os dois ambientes: fica ligado se o outro ambiente ainda tiver conta.
  const { count } = await supabase.from("SchoolPaymentSecret").select("kind", { count: "exact", head: true }).eq("schoolId", schoolId).eq("kind", SECRET_KIND);
  if (!count) {
    const { error: settingsError } = await supabase
      .from("SchoolPaymentSettings")
      .update({ revolutEnabled: false, updatedByUserId: actorUserId, updatedAt: new Date().toISOString() })
      .eq("schoolId", schoolId);
    if (settingsError) return { error: settingsError.message };
  }
  return {};
}
