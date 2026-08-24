/**
 * Normaliza um telefone (com ou sem indicativo) para o formato usado pelo wa.me
 * (dígitos apenas, com indicativo de país). Assume Portugal (+351) quando o
 * número tem 9 dígitos, formato local comum nos perfis de alunos.
 */
export function normalizePhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9) return `351${digits}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

/** Link wa.me com mensagem pré-preenchida; null se o telefone não tiver dígitos válidos. */
export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const digits = normalizePhoneForWhatsApp(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Mensagem padrão de lembrete de mensalidade em atraso. */
export function buildPaymentOverdueMessage(studentFirstName: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Notamos que a tua mensalidade está em atraso — passa na secretaria ou regulariza o pagamento para manteres o acesso às aulas e à plataforma. Qualquer dúvida, é só responder por aqui. Obrigado! 🥋`;
}
