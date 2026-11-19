/**
 * Nota de cansaço do treino (session-RPE): 1–10 em meios pontos, a contar o corpo e a cabeça.
 * Também: foco da aula marcado pelo coach.
 */

export const RPE_MIN = 1;
export const RPE_MAX = 10;
export const RPE_STEP = 0.5;

/** Arredonda ao meio ponto e valida (1–10); null se inválido. */
export function parseRpe(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const v = Math.round(n * 2) / 2;
  return v >= RPE_MIN && v <= RPE_MAX ? v : null;
}

/** «7,5» em pt, «7.5» em en; inteiros sem casas decimais. */
export function formatRpe(n: number, pt = true): string {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return pt ? s.replace(".", ",") : s;
}

/** Descrição curta de cada nota (meios pontos arredondam para cima: 8,5 → como 9). */
export function rpeDescription(value: number, pt: boolean): string {
  const n = Math.round(value);
  if (n <= 2) return pt ? "Muito leve — saí fresco" : "Very light — left feeling fresh";
  if (n <= 4) return pt ? "Leve — pouco cansado" : "Light — a little tired";
  if (n <= 6) return pt ? "Moderado — cansado, mas bem" : "Moderate — tired but fine";
  if (n <= 8) return pt ? "Intenso — corpo ou cabeça bem cansados" : "Hard — body or mind really tired";
  if (n === 9) return pt ? "Muito intenso — quase no limite" : "Very hard — close to the limit";
  return pt ? "Esgotado — física ou mentalmente" : "Exhausted — physically or mentally";
}

/** Cor da nota (verde → vermelho). */
export function rpeColor(value: number): string {
  const n = Math.min(10, Math.max(1, Math.round(value)));
  return ["#4ade80", "#4ade80", "#a3e635", "#a3e635", "#facc15", "#fbbf24", "#f97316", "#f97316", "#ef4444", "#dc2626"][n - 1];
}

export const RPE_QUESTION = {
  pt: "Quão cansado saíste do treino?",
  en: "How tired did you leave training?",
};

export const RPE_PERSONAL_HINT = {
  pt: "Conta o corpo e a cabeça (esforço físico, concentração, decisões) — como te sentes tu, não a dureza da aula em geral.",
  en: "Count body and mind (physical effort, focus, decisions) — how you feel, not how hard the class was in general.",
};

export const RPE_LOAD_HINT = {
  pt: "Carga = cansaço × minutos. Ajuda o coach a ver se treinas demais ou de menos.",
  en: "Load = tiredness × minutes. Helps your coach see if you're training too much or too little.",
};

// --- Foco da aula (marcado pelo coach) ---

export const LESSON_FOCUS = ["TECHNIQUE", "TACTICS", "SPARRING", "PHYSICAL"] as const;
export type LessonFocus = (typeof LESSON_FOCUS)[number];
export const LESSON_FOCUS_MAX = 2;

export const LESSON_FOCUS_META: Record<LessonFocus, { icon: string; pt: string; en: string; color: string }> = {
  TECHNIQUE: { icon: "🥊", pt: "Técnica", en: "Technique", color: "#a1a1aa" },
  TACTICS: { icon: "🧠", pt: "Tática", en: "Tactics", color: "#a78bfa" },
  SPARRING: { icon: "⚔️", pt: "Sparring", en: "Sparring", color: "#f87171" },
  PHYSICAL: { icon: "🏃", pt: "Físico", en: "Physical", color: "#fbbf24" },
};

export function isLessonFocus(x: unknown): x is LessonFocus {
  return typeof x === "string" && (LESSON_FOCUS as readonly string[]).includes(x);
}

/** «Aula técnica + sparring». */
export function lessonFocusLabel(focus: LessonFocus[], pt: boolean): string {
  const names = focus.map((f) => LESSON_FOCUS_META[f][pt ? "pt" : "en"]);
  return pt ? `Aula ${names.join(" + ").toLowerCase()}` : `${names.join(" + ")} class`;
}
