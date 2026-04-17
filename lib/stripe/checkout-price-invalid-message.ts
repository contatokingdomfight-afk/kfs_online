/** Dados extra na resposta 400 `errorCode: STRIPE_PRICE_INVALID` (checkout). */
export type StripePriceInvalidPayload = {
  stripePriceIdUsed?: string;
  stripeKeyMode?: "live" | "test" | "unknown";
};

export function formatStripePriceInvalidUserMessage(
  baseMessage: string,
  locale: "pt" | "en",
  payload: StripePriceInvalidPayload
): string {
  const id = payload.stripePriceIdUsed?.trim();
  if (!id) return baseMessage;
  const mode = payload.stripeKeyMode;
  const modeLabel =
    mode === "live"
      ? locale === "pt"
        ? "live (produção)"
        : "live (production)"
      : mode === "test"
        ? locale === "pt"
          ? "teste"
          : "test"
        : null;
  if (locale === "pt") {
    return `${baseMessage} Ref.: ${id}${modeLabel ? ` · chave Stripe: ${modeLabel}` : ""}.`;
  }
  return `${baseMessage} Ref.: ${id}${modeLabel ? ` · Stripe key: ${modeLabel}` : ""}.`;
}
