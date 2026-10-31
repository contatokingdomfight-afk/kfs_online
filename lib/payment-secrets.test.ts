import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptPaymentSecret, encryptPaymentSecret, paymentSecretsConfigured, type SecretScope } from "./payment-secrets";

const SCOPE: SecretScope = { schoolId: "escola-a", kind: "REVOLUT_MERCHANT_SECRET", environment: "sandbox" };

describe("payment-secrets", () => {
  beforeEach(() => vi.stubEnv("PAYMENT_SECRETS_KEY_SANDBOX", randomBytes(32).toString("base64")));
  afterEach(() => vi.unstubAllEnvs());

  it("decifra o que cifrou, e o valor guardado não contém o segredo", () => {
    const stored = encryptPaymentSecret("sk_segredo", SCOPE);
    expect(stored).not.toContain("sk_segredo");
    expect(decryptPaymentSecret(stored, SCOPE)).toBe("sk_segredo");
  });

  it("não decifra noutra escola, noutro tipo ou noutro ambiente", () => {
    const stored = encryptPaymentSecret("sk_segredo", SCOPE);
    vi.stubEnv("PAYMENT_SECRETS_KEY", process.env.PAYMENT_SECRETS_KEY_SANDBOX ?? "");
    expect(() => decryptPaymentSecret(stored, { ...SCOPE, schoolId: "escola-b" })).toThrow();
    expect(() => decryptPaymentSecret(stored, { ...SCOPE, kind: "REVOLUT_WEBHOOK_SECRET" })).toThrow();
    expect(() => decryptPaymentSecret(stored, { ...SCOPE, environment: "prod" })).toThrow();
  });

  it("recusa valores alterados", () => {
    const [version, iv, tag, ciphertext] = encryptPaymentSecret("sk_segredo", SCOPE).split(".");
    const flipped = Buffer.from(ciphertext, "base64");
    flipped[0] ^= 1;
    expect(() => decryptPaymentSecret([version, iv, tag, flipped.toString("base64")].join("."), SCOPE)).toThrow();
  });

  it("sem chave válida não fica configurado", () => {
    expect(paymentSecretsConfigured("sandbox")).toBe(true);
    vi.stubEnv("PAYMENT_SECRETS_KEY_SANDBOX", "curta");
    expect(paymentSecretsConfigured("sandbox")).toBe(false);
    expect(() => encryptPaymentSecret("sk_segredo", SCOPE)).toThrow();
  });
});
