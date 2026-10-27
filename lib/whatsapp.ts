import { KINGDOM_WEEK_MONTHLY_PRICE_EUR } from "@/lib/drop-in-sessions-pricing";

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

/** Recibo simples depois de registar um pagamento na secretaria. */
export function buildPaymentReceiptMessage(studentFirstName: string, whatLabel: string, amountLabel: string, methodLabel: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Confirmamos a receção do teu pagamento: ${whatLabel} — ${amountLabel} (${methodLabel}). Obrigado! 🥋`;
}

/** Mensagem padrão de lembrete de mensalidade em atraso. */
export function buildPaymentOverdueMessage(studentFirstName: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Notamos que a tua mensalidade está em atraso — passa na secretaria ou regulariza o pagamento para manteres o acesso às aulas e à plataforma. Qualquer dúvida, é só responder por aqui. Obrigado! 🥋`;
}

/** Mensagem para lembrar documentos de adesão pendentes (comprovativo/contrato/termo), com link direto para assinar. */
export function buildDocumentsPendingMessage(studentFirstName: string, signingUrl: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Reparámos que ainda tens documentos de adesão por ler e assinar (comprovativo, condições gerais e termo de responsabilidade). Podes fazer isso aqui: ${signingUrl}. Qualquer dúvida, é só responder por aqui. Obrigado! 🥋`;
}

/**
 * Mensagem para confirmar presença numa aula experimental. `whenLabel` por omissão é "hoje";
 * passa uma data (ex.: "seg., 14 set.") para aulas marcadas para outro dia.
 */
export function buildTrialConfirmationMessage(
  name: string,
  modalityLabel: string,
  time: string,
  whenLabel: string = "hoje"
): string {
  const firstName = name.trim().split(" ")[0] || name.trim();
  const dayPhrase = whenLabel === "hoje" ? "hoje" : `no dia ${whenLabel}`;
  return `Olá ${firstName}! Passando para confirmar a tua aula experimental de ${modalityLabel} ${dayPhrase} às ${time} na Kingdom Fight School. 🥋`;
}

/** Mensagem para quem deixou de treinar («em risco de sair»). */
export function buildMissYouMessage(studentFirstName: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Sentimos a tua falta nos treinos — está tudo bem? Se precisares de ajuda com horários ou com o plano, é só responder por aqui. Esperamos por ti no tatame! 🥋`;
}

/** Mensagem de seguimento para quem fez aula experimental e ainda não se inscreveu. */
export function buildTrialFollowUpMessage(name: string, modalityLabel: string, plansUrl: string): string {
  const firstName = name.trim().split(" ")[0] || name.trim() || "tudo bem";
  return `Olá ${firstName}! 👋 Obrigado por teres experimentado ${modalityLabel} na Kingdom Fight School. Gostaste? Se quiseres continuar, vê aqui os planos: ${plansUrl}. Qualquer dúvida, é só responder por aqui. 🥋`;
}

/** Seguro desportivo e/ou matrícula por pagar (`whatLabel`: ex. «o seguro desportivo de 2026 (25 €)»). */
export function buildFeesOverdueMessage(studentFirstName: string, whatLabel: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Reparámos que ${whatLabel} ainda está por pagar. O seguro é obrigatório para treinar — podes regularizar na secretaria. Se já pagaste, ignora esta mensagem. Obrigado! 🥋`;
}

/** Encomenda da loja por pagar: dados para transferência e referência. */
export function buildOrderPaymentMessage(
  name: string,
  p: { reference: string; total: string; items: string; iban: string; recipient: string; revolut: string; descriptor?: string }
): string {
  const first = name.trim().split(" ")[0] || "tudo bem";
  return [
    `Olá ${first}! 👋`,
    "",
    `Recebemos a tua encomenda ${p.reference}! 🥋`,
    p.items,
    `Total: ${p.total}`,
    "",
    "Para confirmá-la, podes pagar por:",
    `• Transferência IBAN ${p.iban} (${p.recipient})`,
    `• Revolut ${p.revolut}`,
    `• Numerário na secretaria`,
    "",
    `Usa «${p.descriptor?.trim() || p.reference}» no descritivo.`,
    "",
    "Obrigado!",
    "Qualquer dúvida, estamos à disposição. 👊",
  ].join("\n");
}

/** Encomenda pronta a levantar. */
export function buildOrderReadyMessage(name: string, reference: string): string {
  const first = name.trim().split(" ")[0] || "tudo bem";
  return `Olá ${first}! 👋 A tua encomenda ${reference} já chegou e está pronta a levantar na secretaria da Kingdom Fight School. Até já! 🥋`;
}

/** Lembrete simpático antes do prazo da mensalidade (dia 8). */
export function buildDueSoonMessage(studentFirstName: string, dueLabel: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Só para lembrar que a mensalidade deste mês vence ${dueLabel}. Se já pagaste, ignora esta mensagem. Obrigado! 🥋`;
}

/** Kingdom Week: aviso quando o aluno chega à última aula do mês (ou já a esgotou). */
export function buildWeekLimitMessage(studentFirstName: string, used: number, limit: number): string {
  const name = studentFirstName.trim() || "tudo bem";
  if (used >= limit) {
    return `Olá ${name}! 👋\n\nAqui é da Kingdom Fight School. Já usaste as ${limit} aulas do teu plano Kingdom Week deste mês. Se quiseres continuar a treinar, precisas efetuar o pagamento de ${KINGDOM_WEEK_MONTHLY_PRICE_EUR} euros novamente ou pagar por aulas avulsas. 🥋`;
  }
  const left = limit - used;
  return `Olá ${name}! 👋 Aqui é da Kingdom Fight School. Estás na ${used}.ª aula do mês do teu plano Kingdom Week e ${left === 1 ? "ainda tens 1 aula" : `ainda tens ${left} aulas`} até ao fim do mês (${limit} no total). Se quiseres treinar mais, podemos juntar aulas extra — é só responder por aqui. Bons treinos! 🥋`;
}

/** Para quem criou conta mas ainda não escolheu plano. */
export function buildChoosePlanMessage(studentFirstName: string, plansUrl: string): string {
  const name = studentFirstName.trim() || "tudo bem";
  return `Olá ${name}! 👋 Vimos que criaste conta na Kingdom Fight School — bem-vindo! Já escolheste o teu plano? Vê aqui as opções: ${plansUrl}. Se tiveres dúvidas sobre horários ou modalidades, é só responder por aqui. 🥋`;
}

/** Parabéns no dia de anos. */
export function buildBirthdayMessage(studentFirstName: string): string {
  const name = studentFirstName.trim();
  return `Parabéns${name ? `, ${name}` : ""}! 🎉 Toda a equipa da Kingdom Fight School te deseja um dia incrível e um ano cheio de treinos e conquistas. 🥋`;
}
