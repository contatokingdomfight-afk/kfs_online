import { ADMIN_CHAT_TREE, flattenAdminChatTree, type AdminChatNode } from "./tree";

/** Normaliza texto para comparação: minúsculas, sem acentos, sem pontuação. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "a", "o", "os", "as", "um", "uma", "e", "para", "com", "no", "na"]);

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/** Comandos de controlo reconhecidos em qualquer contexto. */
export const CONTROL_COMMANDS = {
  back: ["voltar", "volta", "anterior"],
  home: ["inicio", "menu", "menu principal", "recomecar", "reset"],
  cancel: ["cancelar", "sair", "fechar"],
} as const;

export function matchControlCommand(input: string): keyof typeof CONTROL_COMMANDS | null {
  const norm = normalizeText(input);
  for (const [key, phrases] of Object.entries(CONTROL_COMMANDS)) {
    if (phrases.some((p) => norm === p)) return key as keyof typeof CONTROL_COMMANDS;
  }
  return null;
}

function scoreNode(inputTokens: string[], inputNorm: string, node: AdminChatNode): number {
  const phrases = [node.label, ...node.aliases].map(normalizeText);
  let best = 0;
  for (const phrase of phrases) {
    if (!phrase) continue;
    // Match de frase inteira como substring (sinal forte).
    if (inputNorm.includes(phrase) || phrase.includes(inputNorm)) {
      best = Math.max(best, phrase.split(" ").length * 10);
      continue;
    }
    // Match por tokens em comum.
    const phraseTokens = phrase.split(" ").filter((t) => !STOPWORDS.has(t));
    if (phraseTokens.length === 0) continue;
    const overlap = phraseTokens.filter((t) => inputTokens.includes(t)).length;
    if (overlap > 0) {
      best = Math.max(best, (overlap / phraseTokens.length) * overlap * 3);
    }
  }
  return best;
}

export type MatchResult = { node: AdminChatNode; path: AdminChatNode[]; score: number };

/** Melhor(es) nó(s) candidato(s) para o texto livre, dentro de uma lista de nós. */
export function matchAgainstNodes(input: string, nodes: AdminChatNode[]): MatchResult[] {
  const inputNorm = normalizeText(input);
  const inputTokens = tokenize(input);
  if (inputTokens.length === 0) return [];

  const flat = flattenAdminChatTree(nodes);
  const scored = flat
    .map(({ node, path }) => ({ node, path, score: scoreNode(inputTokens, inputNorm, node) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
}

/** Melhor match na árvore inteira (usado quando não há um submenu ativo). */
export function matchGlobal(input: string): MatchResult[] {
  return matchAgainstNodes(input, ADMIN_CHAT_TREE);
}

/**
 * Atalho: "avaliar performance do <nome>" / "avaliar <nome>" / "performance de <nome>".
 * Se o texto tiver claramente mais conteúdo além do gatilho, extrai o resto como nome de aluno.
 */
export function extractAvaliarPerformanceName(input: string): string | null {
  const norm = normalizeText(input);
  const triggers = [
    "avaliar performance do ",
    "avaliar performance da ",
    "avaliar performance de ",
    "avaliar performance ",
    "avaliar desempenho do ",
    "avaliar desempenho da ",
    "avaliar desempenho de ",
    "avaliar o ",
    "avaliar a ",
    "avaliar ",
    "performance do ",
    "performance da ",
    "performance de ",
  ];
  for (const trigger of triggers) {
    if (norm.startsWith(trigger)) {
      const rest = norm.slice(trigger.length).trim();
      // Evita capturar "performance" sozinho (sem nome) como se fosse um nome.
      if (rest.length >= 2 && !["aluno", "alunos"].includes(rest)) {
        return rest;
      }
    }
  }
  return null;
}
