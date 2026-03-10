/**
 * Dados para a secção "Progressão de Faixas e XP".
 * Faixas simplificadas para a timeline e mapa "O teu caminho".
 */

export type BeltId =
  | "Branca"
  | "Amarela"
  | "Verde"
  | "Azul"
  | "Vermelha"
  | "Preta"
  | "Dourada";

export const BELT_ORDER: BeltId[] = [
  "Branca",
  "Amarela",
  "Verde",
  "Azul",
  "Vermelha",
  "Preta",
  "Dourada",
];

/** XP mínima para atingir cada faixa (para tooltips e timeline). */
export const BELT_XP: Record<BeltId, number> = {
  Branca: 0,
  Amarela: 5_000,
  Verde: 15_000,
  Azul: 40_000,
  Vermelha: 127_000,
  Preta: 255_000,
  Dourada: 500_000,
};

/** Emoji/cor visual por faixa (para timeline e cards). */
export const BELT_DISPLAY: Record<
  BeltId,
  { emoji: string; label: string; bgClass: string; ringClass: string }
> = {
  Branca: {
    emoji: "⚪",
    label: "Branca",
    bgClass: "bg-white/90",
    ringClass: "ring-zinc-400",
  },
  Amarela: {
    emoji: "🟡",
    label: "Amarela",
    bgClass: "bg-yellow-400",
    ringClass: "ring-yellow-500",
  },
  Verde: {
    emoji: "🟢",
    label: "Verde",
    bgClass: "bg-green-500",
    ringClass: "ring-green-600",
  },
  Azul: {
    emoji: "🔵",
    label: "Azul",
    bgClass: "bg-blue-500",
    ringClass: "ring-blue-600",
  },
  Vermelha: {
    emoji: "🔴",
    label: "Vermelha",
    bgClass: "bg-red-500",
    ringClass: "ring-red-600",
  },
  Preta: {
    emoji: "⚫",
    label: "Preta",
    bgClass: "bg-zinc-800",
    ringClass: "ring-zinc-600",
  },
  Dourada: {
    emoji: "✨",
    label: "Dourada",
    bgClass: "bg-amber-400",
    ringClass: "ring-amber-500",
  },
};

/** Significado de cada faixa para "O teu caminho". */
export const BELT_MEANING: Record<BeltId, string> = {
  Branca: "Iniciante",
  Amarela: "Fundamentos",
  Verde: "Desenvolvimento",
  Azul: "Competência",
  Vermelha: "Avançado",
  Preta: "Elite",
  Dourada: "Lenda",
};

export type BeltProgressProps = {
  currentXP: number;
  nextBeltXP: number;
  currentBelt: BeltId;
};

/** Formata número com espaços como separador de milhares (ex.: 72 300). */
export function formatXP(n: number): string {
  return Math.round(n).toLocaleString("pt-PT").replace(/\s/g, " ");
}

/**
 * Mapeia o nome da faixa do backend (ex.: "Azul", "Verde/azul") para BeltId da secção de progressão.
 */
export function beltIdFromRankName(rankName: string | null | undefined): BeltId {
  if (!rankName) return "Branca";
  const n = rankName.toLowerCase();
  if (n.includes("dourad") || n.includes("preta/dourado")) return "Dourada";
  if (n.includes("preta") && !n.includes("dourado")) return "Preta";
  if (n.includes("vermelha")) return "Vermelha";
  if (n.includes("azul")) return "Azul";
  if (n.includes("verde")) return "Verde";
  if (n.includes("amarela")) return "Amarela";
  return "Branca";
}
