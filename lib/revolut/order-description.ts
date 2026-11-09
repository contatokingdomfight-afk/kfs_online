/**
 * Descrição das ordens Revolut (aparece no extrato e no painel da Revolut):
 * - só mensalidades: «Mensalidade nov. 2026 · Kingdom Fight School · Aluno #155»
 * - com outros itens: «Adesão Kingdom Fight School · Aluno #155 — Inscrição 30 € + Seguro 35 € + Mensalidade nov. 2026 55 €»
 * - loja: «Loja KFS-0012 · Aluno #155 — T-shirt (M) ×1, Luvas ×1»
 */

/** Limite prudente (o extrato da Revolut corta descrições longas). */
export const ORDER_DESCRIPTION_MAX = 250;

const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

export type DescriptionItem = { paymentType: string; referenceMonth: string | null; amount: number };

export function shortMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : ym;
}

export function euroShort(n: number): string {
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

export function studentCodeLabel(code: number | string | null | undefined): string | null {
  return code == null || code === "" ? null : `Aluno #${code}`;
}

/** «out. + nov. 2026» / «dez. 2026 + jan. 2027». */
function monthsList(months: string[]): string {
  const sorted = [...new Set(months)].sort();
  const sameYear = sorted.every((m) => m.slice(0, 4) === sorted[0].slice(0, 4));
  if (sameYear) return `${sorted.map((m) => MONTHS[Number(m.slice(5, 7)) - 1]).join(" + ")} ${sorted[0].slice(0, 4)}`;
  return sorted.map(shortMonth).join(" + ");
}

function itemLabel(it: DescriptionItem): string {
  if (it.paymentType === "ENROLLMENT") return "Inscrição";
  if (it.paymentType === "INSURANCE") return "Seguro";
  if (it.paymentType === "LOYALTY_EXIT") return "Saída da fidelização";
  return it.referenceMonth ? `Mensalidade ${shortMonth(it.referenceMonth)}` : "Mensalidade";
}

/** Corta a lista de itens (nunca o início com a marca e o nº de aluno). */
export function clampDescription(head: string, detail: string | null): string {
  if (!detail) return head.slice(0, ORDER_DESCRIPTION_MAX);
  const full = `${head} — ${detail}`;
  if (full.length <= ORDER_DESCRIPTION_MAX) return full;
  const room = ORDER_DESCRIPTION_MAX - head.length - 4;
  return room > 10 ? `${head} — ${detail.slice(0, room - 1)}…` : head.slice(0, ORDER_DESCRIPTION_MAX);
}

/** Pagamentos de mensalidades/adesão/atrasos. `kind` = «Adesão», «Pagamentos»… (usado quando há outros itens). */
export function paymentsOrderDescription(input: { kind: string; brand: string; studentCode: number | string | null; items: DescriptionItem[] }): string {
  const who = studentCodeLabel(input.studentCode);
  const items = input.items.filter((i) => i.amount > 0);
  const onlyTuition = items.length > 0 && items.every((i) => i.paymentType === "TUITION" && i.referenceMonth);
  if (onlyTuition) {
    const months = items.map((i) => i.referenceMonth!);
    const word = new Set(months).size > 1 ? "Mensalidades" : "Mensalidade";
    return clampDescription([`${word} ${monthsList(months)}`, input.brand, who].filter(Boolean).join(" · "), null);
  }
  const head = [`${input.kind} ${input.brand}`, who].filter(Boolean).join(" · ");
  const detail = items.map((i) => `${itemLabel(i)} ${euroShort(i.amount)}`).join(" + ");
  return clampDescription(head, detail || null);
}

/** Encomendas da loja. */
export function storeOrderDescription(input: { reference: string; brand: string; studentCode: number | string | null; lines: { label: string; quantity: number }[] }): string {
  const who = studentCodeLabel(input.studentCode);
  const head = [`Loja ${input.reference}`, input.brand, who].filter(Boolean).join(" · ");
  const detail = input.lines.map((l) => `${l.label} ×${l.quantity}`).join(", ");
  return clampDescription(head, detail || null);
}
