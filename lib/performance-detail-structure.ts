/**
 * Estrutura de referência da performance detalhada por dimensão geral.
 * O aluno vê estes critérios para entender o que é avaliado em cada componente.
 */

export type DetailItem = { label: string; note?: string };
export type DetailGroup = { title: string; items: (string | DetailItem)[]; note?: string };
export type DimensionDetail = { title: string; groups: DetailGroup[] };

const TECNICO: DimensionDetail = {
  title: "Técnico",
  groups: [
    {
      title: "1. Ataque",
      items: [
        "Diretos 1, 2",
        "Circulares H 3, 4",
        "Circulares U 5, 6",
        "Circulares descendentes 7, 8",
      ],
    },
    {
      title: "2. Defesa",
      items: [
        "Bloqueio",
        "Esquivas em pêndulo",
        "Esquiva atrás",
        "Esquivas baixo",
        "Esquiva lateral",
        "Deslocamentos",
      ],
      note: "Defesas ativas e passivas: defesas passivas são menos boas; ativas permitem contra-atacar.",
    },
    {
      title: "4. Deslocamento",
      note: "Todos podem ser feitos em passo completo ou em meio passo.",
      items: [
        "Frontais – frente e trás",
        "Lateral – esquerda e direita",
        "Diagonais – side step",
        "Pivot",
        "Circulares",
        "Troca de guarda (shift)",
        "Passo trocado",
      ],
    },
    {
      title: "5. Fintas",
      items: [
        "Membros superiores – braços",
        "Membros inferiores – pernas",
        "Olhos",
        "Corpo",
      ],
    },
  ],
};

const TATICO: DimensionDetail = {
  title: "Tático",
  groups: [
    {
      title: "Leitura de combate",
      items: [
        "Timing e distância",
        "Escolha de técnicas em função do adversário",
        "Gestão do round",
      ],
    },
    {
      title: "Estratégia",
      items: [
        "Plano de jogo",
        "Adaptação durante o combate",
        "Uso de fintas e combinações",
      ],
    },
  ],
};

const FISICO: DimensionDetail = {
  title: "Físico",
  groups: [
    {
      title: "Condicionamento",
      items: ["Resistência (gás)", "Recuperação entre séries", "Mantém intensidade"],
    },
    {
      title: "Força e potência",
      items: ["Força de golpe", "Velocidade de execução", "Explosividade"],
    },
  ],
};

const MENTAL: DimensionDetail = {
  title: "Mental",
  groups: [
    {
      title: "Foco e atitude",
      items: ["Concentração durante o treino", "Resiliência", "Confiança"],
    },
    {
      title: "Competição",
      items: ["Controlo sob pressão", "Tomada de decisão", "Disciplina"],
    },
  ],
};

const TEORICO: DimensionDetail = {
  title: "Teórico",
  groups: [
    {
      title: "Conhecimento",
      items: [
        "Regras e arbitragem",
        "Conceitos técnicos (posição, guarda, ângulos)",
        "Tática e estratégia teórica",
      ],
    },
    {
      title: "Aplicação",
      items: ["Relaciona teoria com prática", "Compreensão dos feedbacks do treinador"],
    },
  ],
};

export const PERFORMANCE_DETAIL_BY_DIMENSION: Record<string, DimensionDetail> = {
  tecnico: TECNICO,
  tatico: TATICO,
  fisico: FISICO,
  mental: MENTAL,
  teorico: TEORICO,
};

export const PERFORMANCE_DETAIL_ORDER = ["tecnico", "tatico", "fisico", "mental", "teorico"] as const;
