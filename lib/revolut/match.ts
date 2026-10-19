import type { PorReceberItem } from "@/lib/finance/por-receber";

/** Regras puras de correspondência das transferências (sem BD), testadas em match.test.ts. */
export type MatchStatus = "AUTO" | "CONFIRMED" | "SUGGESTED" | "UNMATCHED" | "IGNORED";
export type MatchSuggestion = { itemKey: string; label: string; amount: number };

/** Referência fixa do aluno para o descritivo (ex.: KFS-0123). */
export function studentPaymentReference(code: number | null | undefined): string | null {
  return code != null ? `KFS-${String(code).padStart(4, "0")}` : null;
}

export function normalizePayer(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/^(PAYMENT|TRANSFER|MONEY ADDED|TRANSFERENCIA|PAGAMENTO)?\s*(FROM|DE)\s+/, "")
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const tokens = (s: string) => normalizePayer(s).split(" ").filter((t) => t.length > 1);

/** O nome de quem paga bate com o nome do aluno? (primeiro nome + um apelido, ou 2+ palavras em comum) */
export function namesMatch(payer: string, student: string): boolean {
  const p = tokens(payer);
  const s = tokens(student);
  if (p.length === 0 || s.length === 0) return false;
  const common = p.filter((t) => s.includes(t));
  return (p[0] === s[0] && common.length >= 2) || common.length >= 3;
}

export function parseReferences(text: string): { orderNumber: number | null; studentCode: number | null } {
  const t = text.toUpperCase();
  const order = t.match(/KFS[\s-]*ENC[\s-]*(\d{1,6})/);
  const student = t.replace(/KFS[\s-]*ENC[\s-]*\d{1,6}/g, "").match(/KFS[\s-]*(\d{3,6})\b/);
  return { orderNumber: order ? Number(order[1]) : null, studentCode: student ? Number(student[1]) : null };
}

const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
const canAutoApply = (it: PorReceberItem) => it.kind === "TUITION" || it.kind === "ORDER";
export const itemLabel = (it: PorReceberItem) => `${it.name} · ${it.what}`;

type MatchResult = {
  status: MatchStatus;
  item: PorReceberItem | null;
  studentId: string | null;
  label: string | null;
  suggestions: MatchSuggestion[];
};

/** Decide a que pagamento em aberto corresponde uma transferência. Puro (sem BD). */
export function matchTransfer(
  tx: { amount: number; payerName: string; reference: string },
  items: PorReceberItem[],
  ctx: { studentByCode: Map<number, string>; aliasStudent: string | null; orderNumberById: Map<string, number> }
): MatchResult {
  const refs = parseReferences(`${tx.reference} ${tx.payerName}`);
  const toSug = (list: PorReceberItem[]) => list.slice(0, 6).map((it) => ({ itemKey: it.key, label: itemLabel(it), amount: it.amount }));

  // 1) Referência de encomenda (KFS-ENC-0045).
  if (refs.orderNumber != null) {
    const it = items.find((i) => i.kind === "ORDER" && i.orderId && ctx.orderNumberById.get(i.orderId) === refs.orderNumber);
    if (it) return eq(it.amount, tx.amount) ? { status: "AUTO", item: it, studentId: it.studentId || null, label: itemLabel(it), suggestions: [] } : { status: "SUGGESTED", item: null, studentId: it.studentId || null, label: null, suggestions: toSug([it]) };
  }

  // 2) Referência do aluno (KFS-0123) ou pagador já conhecido.
  const knownStudent = (refs.studentCode != null ? ctx.studentByCode.get(refs.studentCode) : undefined) ?? ctx.aliasStudent;
  if (knownStudent) {
    const mine = items.filter((i) => i.studentId === knownStudent);
    const exact = mine.filter((i) => eq(i.amount, tx.amount));
    const tuitionFirst = [...exact].sort((a, b) => Number(b.kind === "TUITION") - Number(a.kind === "TUITION") || Number(a.group === "month") - Number(b.group === "month"));
    const best = tuitionFirst[0];
    if (best && canAutoApply(best)) {
      return { status: "AUTO", item: best, studentId: knownStudent, label: itemLabel(best), suggestions: [] };
    }
    return { status: mine.length ? "SUGGESTED" : "UNMATCHED", item: null, studentId: knownStudent, label: null, suggestions: toSug(mine) };
  }

  // 3) Nome de quem paga + valor.
  const byName = items.filter((i) => i.name && namesMatch(tx.payerName, i.name));
  const byNameExact = byName.filter((i) => eq(i.amount, tx.amount));
  const students = new Set(byNameExact.map((i) => i.studentId));
  if (byNameExact.length >= 1 && students.size === 1) {
    const best = [...byNameExact].sort((a, b) => Number(b.kind === "TUITION") - Number(a.kind === "TUITION") || Number(a.group === "month") - Number(b.group === "month"))[0];
    if (canAutoApply(best)) return { status: "AUTO", item: best, studentId: best.studentId, label: itemLabel(best), suggestions: [] };
    return { status: "SUGGESTED", item: null, studentId: best.studentId, label: null, suggestions: toSug(byNameExact) };
  }
  if (byName.length) return { status: "SUGGESTED", item: null, studentId: null, label: null, suggestions: toSug(byNameExact.length ? byNameExact : byName) };

  // 4) Nada certo: sugere o que tem o mesmo valor (o admin escolhe).
  return { status: "UNMATCHED", item: null, studentId: null, label: null, suggestions: toSug(items.filter((i) => eq(i.amount, tx.amount))) };
}

