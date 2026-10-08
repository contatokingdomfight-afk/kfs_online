/**
 * Foto da Tribo de fundo em cada aula da página inicial.
 *
 * As fotos são baralhadas uma vez por semana (semente = semana ISO da aula) e distribuídas
 * aula a aula pela ordem das aulas dessa semana: dentro da mesma semana cada aula tem uma foto
 * diferente (enquanto houver fotos suficientes) e a escolha não muda entre visitas — só muda
 * quando muda a semana.
 */

export type LessonPhotoKeyInput = { key: string; date: string; startTime: string };

/** Semana ISO de uma data `yyyy-MM-dd` como `2026-W41` (independente do fuso: só usa a data civil). */
export function isoWeekKey(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7; // segunda = 1 … domingo = 7
  date.setUTCDate(date.getUTCDate() + 4 - day); // quinta-feira da mesma semana
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gerador pseudo-aleatório determinístico (mulberry32). */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledIndexes(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const rnd = seededRandom(hashString(seed));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Devolve `key da aula → url da foto`. `lessons` deve incluir todas as aulas das semanas em causa
 * (mesmo as que já passaram), para a posição de cada aula na semana não mudar ao longo dos dias.
 */
export function assignWeeklyTribePhotos(
  lessons: LessonPhotoKeyInput[],
  photoUrls: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  if (photoUrls.length === 0) return out;

  const byWeek = new Map<string, LessonPhotoKeyInput[]>();
  for (const l of lessons) {
    const wk = isoWeekKey(l.date);
    const list = byWeek.get(wk) ?? [];
    list.push(l);
    byWeek.set(wk, list);
  }

  for (const [week, list] of byWeek) {
    const sorted = [...list].sort((a, b) =>
      a.date === b.date ? a.startTime.localeCompare(b.startTime) || a.key.localeCompare(b.key) : a.date.localeCompare(b.date)
    );
    const order = shuffledIndexes(photoUrls.length, week);
    sorted.forEach((l, i) => {
      out[l.key] = photoUrls[order[i % order.length]];
    });
  }
  return out;
}
