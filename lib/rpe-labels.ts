/** Descrição curta de cada nota de esforço percebido (RPE 1–10). */
export function rpeDescription(n: number, pt: boolean): string {
  if (n <= 2) return pt ? "Muito leve" : "Very light";
  if (n <= 4) return pt ? "Leve — dava para conversar à vontade" : "Light — could chat easily";
  if (n <= 6) return pt ? "Moderado" : "Moderate";
  if (n <= 8) return pt ? "Intenso — a respiração pesa" : "Hard — breathing is heavy";
  if (n === 9) return pt ? "Muito intenso — quase no limite" : "Very hard — close to the limit";
  return pt ? "Máximo — o mais duro possível" : "Maximum — as hard as it gets";
}

export const RPE_PERSONAL_HINT = {
  pt: "Quão pesado foi para ti — não a dureza da aula em geral.",
  en: "How hard it felt for you — not how hard the class was in general.",
};

export const RPE_LOAD_HINT = {
  pt: "Carga = esforço × minutos. Ajuda o coach a ver se treinas demais ou de menos.",
  en: "Load = effort × minutes. Helps your coach see if you're training too much or too little.",
};
