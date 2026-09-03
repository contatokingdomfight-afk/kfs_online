import type { GeneralPerformanceAxisId } from "@/lib/performance-utils";

export type ScoreAnchorPoint = { range: string; description: string };

/**
 * Referência do que cada faixa de nota (1–10) significa, por pilar geral.
 * Reutilizada em todos os critérios do mesmo pilar — evita escrever uma
 * âncora própria para cada um dos centenas de critérios configurados.
 */
export const SCORE_ANCHORS: Record<GeneralPerformanceAxisId, ScoreAnchorPoint[]> = {
  tecnico: [
    { range: "1–2", description: "Não executa a forma básica do movimento." },
    { range: "3–4", description: "Executa com erros estruturais frequentes; precisa de correção constante." },
    { range: "5–6", description: "Forma correta na maior parte das vezes, mas inconsistente sob repetição ou pressão." },
    { range: "7–8", description: "Execução consistente e tecnicamente correta." },
    { range: "9–10", description: "Execução automática e correta mesmo sob pressão, fadiga ou adversário ativo." },
  ],
  tatico: [
    { range: "1–2", description: "Não aplica em combate/simulação." },
    { range: "3–4", description: "Aplica raramente, de forma isolada e sem ler o contexto." },
    { range: "5–6", description: "Aplica, mas com timing ou leitura de oportunidade inconsistentes." },
    { range: "7–8", description: "Aplica com bom timing na maioria das situações." },
    { range: "9–10", description: "Aplica com timing e adaptação de nível competitivo." },
  ],
  fisico: [
    { range: "1–2", description: "Rendimento muito abaixo do esperado para o nível do aluno." },
    { range: "3–4", description: "Abaixo da média; cansa ou perde qualidade de movimento cedo." },
    { range: "5–6", description: "Na média esperada para o nível." },
    { range: "7–8", description: "Acima da média; mantém qualidade sob esforço prolongado." },
    { range: "9–10", description: "Nível de destaque/competição." },
  ],
  mental: [
    { range: "1–2", description: "Perde o controle emocional ou desiste diante de dificuldade." },
    { range: "3–4", description: "Abala-se facilmente; recupera com dificuldade." },
    { range: "5–6", description: "Mantém-se estável na maior parte do tempo, com quebras pontuais." },
    { range: "7–8", description: "Mantém foco e compostura mesmo sob pressão." },
    { range: "9–10", description: "Controle emocional e foco de nível competitivo, mesmo em adversidade." },
  ],
  teorico: [
    { range: "1–2", description: "Não sabe explicar o conceito." },
    { range: "3–4", description: "Explica de forma incompleta ou com erros conceituais." },
    { range: "5–6", description: "Explica o essencial, mas com falhas em detalhes." },
    { range: "7–8", description: "Explica com clareza e correção." },
    { range: "9–10", description: "Explica com profundidade e consegue ensinar a outros." },
  ],
};
