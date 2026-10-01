import type { Locale } from "@/lib/i18n";

/** Mensagens de erro mais comuns do Supabase Auth, traduzidas PT/EN (a API devolve sempre em inglês). */
const KNOWN_ERRORS: { match: (m: string) => boolean; pt: string; en: string }[] = [
  {
    match: (m) => m.includes("invalid login credentials"),
    pt: "Email ou palavra-passe incorretos.",
    en: "Incorrect email or password.",
  },
  {
    match: (m) => m.includes("user already registered") || m.includes("already registered"),
    pt: "Já existe uma conta com este email.",
    en: "An account with this email already exists.",
  },
  {
    match: (m) => m.includes("password should be at least"),
    pt: "A senha deve ter pelo menos 6 caracteres.",
    en: "The password must be at least 6 characters long.",
  },
  {
    match: (m) => m.includes("unable to validate email address") || m.includes("invalid email"),
    pt: "Email inválido.",
    en: "Invalid email address.",
  },
  {
    match: (m) => m.includes("rate limit"),
    pt: "Demasiados pedidos. Aguarda um pouco e tenta novamente.",
    en: "Too many requests. Please wait a moment and try again.",
  },
  {
    match: (m) => m.includes("network") || m.includes("fetch failed"),
    pt: "Falha de ligação. Verifica a internet e tenta novamente.",
    en: "Connection failed. Check your internet and try again.",
  },
];

/** Traduz mensagens de erro conhecidas do Supabase Auth; devolve a original se não reconhecida. */
export function translateAuthErrorMessage(message: string, locale: Locale): string {
  const m = message.toLowerCase();
  const found = KNOWN_ERRORS.find((e) => e.match(m));
  if (!found) return message;
  return locale === "en" ? found.en : found.pt;
}
