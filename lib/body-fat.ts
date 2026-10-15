/**
 * % de gordura por adipometria (pregas cutâneas): Jackson & Pollock de 3 pregas + equação de Siri.
 *
 *  - Homens:   peitoral + abdominal + coxa
 *  - Mulheres: tricipital + suprailíaca + coxa
 *
 * Pregas em mm, idade em anos. Devolve null quando faltam dados ou o resultado é implausível.
 */

export type SkinfoldsMm = {
  chest?: number | null;
  abdomen?: number | null;
  thigh?: number | null;
  triceps?: number | null;
  suprailiac?: number | null;
};

export type BiologicalSex = "M" | "F";

export const BODY_FAT_METHOD_JP3 = "Jackson-Pollock 3 pregas";

/** Prega válida (mm): 1–80. Vazio ou fora do intervalo → null. */
export function parseSkinfoldMm(raw: string | null | undefined): number | null {
  const s = (raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 1 && n <= 80 ? Math.round(n * 10) / 10 : null;
}

/** Pregas necessárias para o sexo indicado (nomes dos campos de `SkinfoldsMm`). */
export function requiredSkinfolds(sex: BiologicalSex): (keyof SkinfoldsMm)[] {
  return sex === "M" ? ["chest", "abdomen", "thigh"] : ["triceps", "suprailiac", "thigh"];
}

export function computeBodyFatPct(sex: BiologicalSex, ageYears: number, s: SkinfoldsMm): number | null {
  if (!Number.isFinite(ageYears) || ageYears < 15 || ageYears > 90) return null;
  const parts = requiredSkinfolds(sex).map((k) => s[k]);
  if (parts.some((v) => v == null || !Number.isFinite(v as number))) return null;
  const sum = (parts as number[]).reduce((a, b) => a + b, 0);

  const density =
    sex === "M"
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * ageYears
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * ageYears;
  if (!(density > 0.9 && density < 1.2)) return null;

  const pct = 495 / density - 450; // Siri
  if (!Number.isFinite(pct) || pct < 2 || pct > 60) return null;
  return Math.round(pct * 10) / 10;
}

/** Idade em anos completos a uma data (AAAA-MM-DD). */
export function ageOnDate(dateOfBirthYmd: string, onYmd: string): number | null {
  const dob = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirthYmd);
  const on = /^(\d{4})-(\d{2})-(\d{2})/.exec(onYmd);
  if (!dob || !on) return null;
  let age = Number(on[1]) - Number(dob[1]);
  if (Number(on[2]) < Number(dob[2]) || (Number(on[2]) === Number(dob[2]) && Number(on[3]) < Number(dob[3]))) age -= 1;
  return age >= 0 ? age : null;
}
