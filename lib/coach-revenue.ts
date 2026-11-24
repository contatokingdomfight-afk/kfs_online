/**
 * Remuneração dos professores sobre mensalidades (cláusula 6.ª do contrato; DOCS/MINUTA_Contrato_Professor.md).
 * Funções puras: recebem as mensalidades do mês já resolvidas e devolvem a parte de cada professor.
 *
 * Regras (sobre o valor-base = preço de TABELA ÷ 1,23; descontos da escola não contam):
 *  - PER_MODALITY: % por cada modalidade do aluno que o professor dá (plano 1 modalidade = 40%, 2 = 35% cada);
 *  - SPLIT_POOL:  % dividida por todos os professores da escola com modalidades de adultos (pack «todas» = 80%);
 *  - FIXED:       € fixos, para o(s) professor(es) da modalidade principal (Kingdom Week = 10 €);
 *  - NONE:        professor não recebe.
 * Vários professores na mesma modalidade → partes iguais.
 */

export const VAT_RATE = 0.23;

export type CoachShareMode = "NONE" | "PER_MODALITY" | "SPLIT_POOL" | "FIXED";
export type ModalityScope = "NONE" | "SINGLE" | "DUAL" | "ALL";

export type PlanRule = {
  id: string;
  name: string;
  /** Preço de tabela (com IVA). */
  price: number;
  scope: ModalityScope;
  mode: CoachShareMode;
  value: number | null;
};

export type TuitionCharge = {
  /** Id único da linha (ex.: id do pagamento + id do aluno, no caso das famílias). */
  key: string;
  studentId: string;
  studentName: string;
  plan: PlanRule;
  primaryModality: string | null;
  secondaryModality: string | null;
  /** true = paga no mês (conta para «recebido»); false = do mês e ainda por pagar (conta para a previsão). */
  paid: boolean;
  paidAt: string | null;
};

export type CoachShareLine = {
  key: string;
  studentId: string;
  studentName: string;
  planName: string;
  /** Modalidades do aluno que contaram para este professor. */
  modalities: string[];
  rule: string;
  amount: number;
  paid: boolean;
  paidAt: string | null;
};

export type CoachMonthSummary = {
  coachId: string;
  received: number;
  pending: number;
  forecast: number;
  studentCount: number;
  paidStudentCount: number;
  pendingStudentCount: number;
  lines: CoachShareLine[];
};

export function round2(n: number): number {
  // toFixed(6) limpa o erro de vírgula flutuante (ex.: 18,4975 a sair 18,497499…) antes de arredondar ao cêntimo.
  return Math.round(Number((n * 100).toFixed(6))) / 100;
}

export function baseWithoutVat(price: number, vatRate = VAT_RATE): number {
  return round2(price / (1 + vatRate));
}

/** Modalidades KIDS (MTKIDS, BJJKIDS…): os professores só de KIDS não entram na divisão do pack «todas». */
export function isKidsModality(code: string): boolean {
  return code.toUpperCase().endsWith("KIDS");
}

function pct(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1).replace(".", ",")}%`;
}

/** Modalidades do aluno que contam para o plano (a 2.ª só nos planos de 2 modalidades). */
export function chargeModalities(c: Pick<TuitionCharge, "plan" | "primaryModality" | "secondaryModality">): string[] {
  const out: string[] = [];
  if (c.primaryModality) out.push(c.primaryModality);
  if (c.plan.scope === "DUAL" && c.secondaryModality && c.secondaryModality !== c.primaryModality) out.push(c.secondaryModality);
  return out;
}

/**
 * Parte de cada professor numa mensalidade. `coachModalities`: professor → modalidades que dá nesta escola.
 * Devolve só os professores que recebem algo.
 */
export function splitCharge(
  charge: TuitionCharge,
  coachModalities: ReadonlyMap<string, ReadonlySet<string>>
): { coachId: string; amount: number; rule: string; modalities: string[] }[] {
  const { plan } = charge;
  const value = plan.value ?? 0;
  if (plan.mode === "NONE" || value <= 0) return [];
  const base = baseWithoutVat(plan.price);
  const teachers = (code: string) => [...coachModalities].filter(([, mods]) => mods.has(code)).map(([id]) => id);

  if (plan.mode === "SPLIT_POOL") {
    const pool = [...coachModalities].filter(([, mods]) => [...mods].some((m) => !isKidsModality(m))).map(([id]) => id);
    if (pool.length === 0) return [];
    const amount = round2((base * value) / 100 / pool.length);
    const rule = pool.length > 1 ? `${pct(value)} ÷ ${pool.length}` : pct(value);
    return pool.map((coachId) => ({ coachId, amount, rule, modalities: [] }));
  }

  const mods = plan.mode === "FIXED" ? chargeModalities(charge).slice(0, 1) : chargeModalities(charge);
  const acc = new Map<string, { amount: number; parts: string[]; modalities: string[] }>();
  for (const m of mods) {
    const who = teachers(m);
    if (who.length === 0) continue;
    const each = plan.mode === "FIXED" ? value / who.length : (base * value) / 100 / who.length;
    const part = plan.mode === "FIXED" ? (who.length > 1 ? `fixo ÷ ${who.length}` : "fixo") : who.length > 1 ? `${pct(value)} ÷ ${who.length}` : pct(value);
    for (const coachId of who) {
      const cur = acc.get(coachId) ?? { amount: 0, parts: [], modalities: [] };
      cur.amount += each;
      cur.parts.push(part);
      cur.modalities.push(m);
      acc.set(coachId, cur);
    }
  }
  return [...acc].map(([coachId, v]) => ({
    coachId,
    amount: round2(v.amount),
    rule: v.parts.length === 2 && v.parts[0] === v.parts[1] && !v.parts[0].includes("÷") ? `${v.parts[0]} × 2` : v.parts.join(" + "),
    modalities: v.modalities,
  }));
}

/** Resumo do mês por professor. */
export function computeCoachMonth(
  charges: readonly TuitionCharge[],
  coachModalities: ReadonlyMap<string, ReadonlySet<string>>
): Map<string, CoachMonthSummary> {
  const out = new Map<string, CoachMonthSummary>();
  for (const coachId of coachModalities.keys()) {
    out.set(coachId, { coachId, received: 0, pending: 0, forecast: 0, studentCount: 0, paidStudentCount: 0, pendingStudentCount: 0, lines: [] });
  }
  for (const charge of charges) {
    for (const s of splitCharge(charge, coachModalities)) {
      const sum = out.get(s.coachId)!;
      sum.lines.push({
        key: charge.key,
        studentId: charge.studentId,
        studentName: charge.studentName,
        planName: charge.plan.name,
        modalities: s.modalities,
        rule: s.rule,
        amount: s.amount,
        paid: charge.paid,
        paidAt: charge.paidAt,
      });
    }
  }
  for (const sum of out.values()) {
    sum.received = round2(sum.lines.filter((l) => l.paid).reduce((a, l) => a + l.amount, 0));
    sum.pending = round2(sum.lines.filter((l) => !l.paid).reduce((a, l) => a + l.amount, 0));
    sum.forecast = round2(sum.received + sum.pending);
    const paid = new Set(sum.lines.filter((l) => l.paid).map((l) => l.studentId));
    const pend = new Set(sum.lines.filter((l) => !l.paid && !paid.has(l.studentId)).map((l) => l.studentId));
    sum.paidStudentCount = paid.size;
    sum.pendingStudentCount = pend.size;
    sum.studentCount = new Set(sum.lines.map((l) => l.studentId)).size;
    sum.lines.sort((a, b) => Number(b.paid) - Number(a.paid) || a.studentName.localeCompare(b.studentName, "pt"));
  }
  return out;
}

/** Linhas agrupadas por plano + regra, para a tabela «Por plano». */
export function groupLinesByPlan(lines: readonly CoachShareLine[]) {
  const groups = new Map<string, { planName: string; rule: string; students: Set<string>; received: number; pending: number }>();
  for (const l of lines) {
    const k = `${l.planName}|${l.rule}`;
    const g = groups.get(k) ?? { planName: l.planName, rule: l.rule, students: new Set<string>(), received: 0, pending: 0 };
    g.students.add(l.studentId);
    if (l.paid) g.received += l.amount;
    else g.pending += l.amount;
    groups.set(k, g);
  }
  return [...groups.values()]
    .map((g) => ({ planName: g.planName, rule: g.rule, studentCount: g.students.size, received: round2(g.received), pending: round2(g.pending) }))
    .sort((a, b) => b.received + b.pending - (a.received + a.pending));
}
