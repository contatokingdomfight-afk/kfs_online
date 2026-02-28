import { messages, type Locale, type MessageKey } from "./messages";

/**
 * Retorna função de tradução para o locale dado.
 * Uso: const t = getTranslations(locale); t("navHome") => "Início" | "Home"
 */
export function getTranslations(locale: Locale): (key: MessageKey) => string {
  const dict = messages[locale] ?? messages.pt;
  return (key: MessageKey) => (dict[key] as string) ?? (messages.pt[key] as string) ?? key;
}

export { messages };
export type { Locale, MessageKey };
