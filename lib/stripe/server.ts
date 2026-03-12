import Stripe from "stripe";

// Sanitiza a chave: remove espaços, newlines e aspas que causam ERR_INVALID_CHAR no header Authorization
const rawSecret = process.env.STRIPE_SECRET_KEY;
const secret = typeof rawSecret === "string" ? rawSecret.replace(/[\s'"`]/g, "").trim() || null : null;
export const stripe = secret ? new Stripe(secret, { typescript: true }) : null;
export const STRIPE_WEBHOOK_SECRET = (() => {
  const raw = process.env.STRIPE_WEBHOOK_SECRET;
  return typeof raw === "string" ? raw.replace(/[\s'"`]/g, "").trim() || null : null;
})();
