import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra das credenciais em `SchoolPaymentSecret` (AES-256-GCM). A base de dados nunca vê o valor em claro.
 * Variáveis: PAYMENT_SECRETS_KEY e PAYMENT_SECRETS_KEY_SANDBOX, 32 bytes em base64 (`openssl rand -base64 32`).
 * Cada valor fica preso à sua linha (escola + tipo + ambiente): copiado para outra linha, deixa de decifrar.
 */
export type SecretEnvironment = "sandbox" | "prod";

export type SecretScope = { schoolId: string; kind: string; environment: SecretEnvironment };

const VERSION = "v1";

function encryptionKey(environment: SecretEnvironment): Buffer | null {
  const raw = (environment === "sandbox" ? process.env.PAYMENT_SECRETS_KEY_SANDBOX : process.env.PAYMENT_SECRETS_KEY)?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function paymentSecretsConfigured(environment: SecretEnvironment): boolean {
  return encryptionKey(environment) !== null;
}

const additionalData = (scope: SecretScope) => Buffer.from(`${scope.schoolId}|${scope.kind}|${scope.environment}`);

export function encryptPaymentSecret(plaintext: string, scope: SecretScope): string {
  const key = encryptionKey(scope.environment);
  if (!key) throw new Error("Chave de cifra dos pagamentos em falta ou inválida");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(additionalData(scope));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

/** Lança erro se o valor tiver sido alterado, for de outra linha ou tiver sido cifrado com outra chave. */
export function decryptPaymentSecret(stored: string, scope: SecretScope): string {
  const key = encryptionKey(scope.environment);
  if (!key) throw new Error("Chave de cifra dos pagamentos em falta ou inválida");
  const [version, iv, tag, ciphertext] = stored.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error("Formato de segredo desconhecido");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAAD(additionalData(scope));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
