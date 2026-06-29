/** Erros Supabase quando o email ainda não foi confirmado. */
export function isEmailNotConfirmedError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("email not confirmed") ||
    m.includes("not confirmed") ||
    m.includes("email não confirmado") ||
    m.includes("email address not confirmed")
  );
}
