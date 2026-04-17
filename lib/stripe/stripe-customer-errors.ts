/** Resposta Stripe quando o `cus_…` na BD não existe para a chave em uso (test/live trocados ou cliente apagado). */
export function isStripeCustomerInvalidForKey(message: string): boolean {
  const m = message;
  if (/No such customer/i.test(m)) return true;
  if (/similar object exists in test mode/i.test(m) && /live mode key/i.test(m)) return true;
  if (/similar object exists in live mode/i.test(m) && /test mode key/i.test(m)) return true;
  return false;
}
