/**
 * Matriz de Graduação Kingdom Fight (Boxe) — luvas em vez de prajied.
 * Mesmas cores, nomes, lemas e tempos mínimos do Muay Thai (a filosofia das cores é a mesma);
 * o conteúdo técnico, tático e físico é próprio do Boxe. Cada grau descreve o que o aluno precisa para OBTER esse grau.
 * É um ponto de partida: o admin edita tudo no editor de graduação.
 */

import type { SeedGrade } from "./kingdom-muay-thai-template";

const C = {
  branco: "#F5F5F5",
  laranja: "#F97316",
  azulCeleste: "#38BDF8",
  roxo: "#7C3AED",
  verdeLimao: "#84CC16",
  preto: "#111111",
  prata: "#A8A9AD",
  vermelho: "#DC2626",
};

export const KINGDOM_BOXING_GRADES: SeedGrade[] = [
  {
    name: "Branco",
    subtitle: "Pureza e Início",
    motto: "Eu começo.",
    objective: "Postura, guarda, jab e direto, e deslocamento básico sem perder a base.",
    colors: [C.branco],
    minMonths: 3,
    axes: {
      TECNICO: [
        "Base de boxe (pés à largura dos ombros, peso distribuído)",
        "Guarda alta: mãos no rosto, cotovelos fechados, queixo baixo",
        "Jab com retorno à guarda",
        "Direto com rotação de anca e pé de trás",
        "Combinação 1-2 (jab-direto)",
        "Passo à frente e atrás sem cruzar os pés",
        "Passo lateral para os dois lados",
        "Bloqueio básico com a luva (parry do jab)",
        "Enfaixar as mãos corretamente",
      ],
      TATICO: [
        "Noção de distância longa (alcance do jab)",
        "Atacar e voltar à guarda",
        "Não ficar parado na linha do adversário depois de atacar",
        "Reconhecer o jab do adversário",
      ],
      TEORICO: [
        "Código de conduta da academia",
        "Respeito aos colegas e instrutores",
        "Nomenclatura dos golpes (1 a 6)",
        "Zonas de ataque permitidas no boxe",
        "Regras básicas de segurança",
        "Equipamento: luvas, ligaduras, protetor bucal",
      ],
      FISICO: [
        "Saltar à corda 3 minutos com ritmo",
        "Coordenação de pés e mãos",
        "Equilíbrio em deslocamento",
        "Resistência aeróbica inicial",
        "Manter a guarda durante um round de 2 minutos",
        "Controlo respiratório ao golpear",
      ],
    },
  },
  {
    name: "Branco/Laranja",
    subtitle: "Despertar da Vontade",
    motto: "Eu me comprometo.",
    objective: "Ganchos e uppercuts, primeiras combinações e primeiras defesas com o tronco.",
    colors: [C.branco, C.laranja],
    minMonths: 3,
    axes: {
      TECNICO: [
        "Gancho da frente (3) à cabeça",
        "Gancho de trás (4) à cabeça",
        "Uppercut da frente (5) e de trás (6)",
        "Combinações 1-2-3 e 1-2-3-2",
        "Esquiva lateral (slip) do jab e do direto",
        "Bloqueio do gancho com o braço (cobertura)",
        "Pivot sobre o pé da frente",
        "Duplo jab com deslocamento à frente",
      ],
      TATICO: [
        "Distância média: quando usar ganchos e uppercuts",
        "Defender e responder com um golpe",
        "Sair em ângulo depois de uma combinação",
        "Manter o queixo protegido nas trocas",
      ],
      TEORICO: [
        "Conceito de disciplina e compromisso com o treino",
        "Diferença entre golpes retos e curvos",
        "Como funciona um round e o descanso",
        "Higiene e cuidado com o equipamento",
      ],
      FISICO: [
        "Corda 5 minutos sem parar",
        "3 rounds de saco de 2 minutos a ritmo constante",
        "Rotação de tronco com estabilidade",
        "Força de core (pranchas e rotações)",
        "Recuperação entre rounds",
      ],
    },
  },
  {
    name: "Laranja",
    subtitle: "Energia e Entusiasmo",
    motto: "Eu desenvolvo.",
    objective: "Os 6 golpes com volume, ritmo e resistência; primeiras manoplas e sparring técnico.",
    colors: [C.laranja],
    minMonths: 4,
    axes: {
      TECNICO: [
        "Os 6 golpes com técnica limpa, com as duas guardas de referência",
        "Combinações de 3 a 4 golpes com retorno à guarda",
        "Golpes ao corpo: jab, direto e gancho ao fígado",
        "Pêndulo (bob and weave) por baixo do gancho",
        "Recuo com jab (jab em retirada)",
        "Trabalho de manopla com o coach",
        "Sparring técnico leve",
      ],
      TATICO: [
        "Gerir a distância longa e média",
        "Trocar de alvo: cabeça e corpo",
        "Volume de golpes sem perder a guarda",
        "Usar o jab para medir e abrir caminho",
      ],
      TEORICO: [
        "Regras do boxe amador",
        "Pontuação: golpes limpos, defesa e controlo do ringue",
        "Conceito de humildade no sparring",
        "Segurança no sparring",
      ],
      FISICO: [
        "4 rounds de saco de 3 minutos",
        "Velocidade de mãos (sombra com elásticos ou pesos leves)",
        "Resistência anaeróbica (tiros de 30 segundos)",
        "Força de pernas e de tronco",
        "Mobilidade de ombros e anca",
      ],
    },
  },
  {
    name: "Laranja/Azul Celeste",
    subtitle: "Equilíbrio em Formação",
    motto: "Eu controlo.",
    objective: "Defesa ativa e contra-ataque, controlo da distância e uso do ringue.",
    colors: [C.laranja, C.azulCeleste],
    minMonths: 5,
    axes: {
      TECNICO: [
        "Parry e contra-ataque imediato",
        "Esquiva com contra (slip and counter)",
        "Pêndulo e resposta com gancho",
        "Bloqueio e resposta (block and return)",
        "Defesa do corpo com o cotovelo",
        "Trabalho de pés em círculo (para os dois lados)",
        "Saída de ângulo com pivot depois de atacar",
      ],
      TATICO: [
        "Controlo do centro do ringue",
        "Não ficar encostado às cordas nem ao canto",
        "Usar a distância para obrigar o adversário a falhar",
        "Contra-ataque ao jab do adversário",
        "Gerir o ritmo ao longo do round",
      ],
      TEORICO: [
        "Conceito de defesa ativa vs. passiva",
        "Ciclo atacar-defender-contra-atacar",
        "Ética no sparring e respeito pelo parceiro",
      ],
      FISICO: [
        "Sparring de 3 rounds de 2 minutos",
        "Agilidade de pés (escada de agilidade, deslocamentos)",
        "Tempo de reação (bola de reflexos, estímulos do coach)",
        "Resistência específica de round",
      ],
    },
  },
  {
    name: "Azul Celeste",
    subtitle: "Clareza e Perspicácia",
    motto: "Eu compreendo.",
    objective: "Leitura de jogo, ritmo e serenidade no sparring; contra-ataques planeados.",
    colors: [C.azulCeleste],
    minMonths: 6,
    axes: {
      TECNICO: [
        "Contra-ataques planeados a cada golpe do adversário",
        "Fintas com as mãos, ombros e pés",
        "Mudança de nível (golpear ao corpo e subir à cabeça)",
        "Clinch defensivo e saída do clinch",
        "Trabalho em guarda trocada (canhoto vs. destro)",
      ],
      TATICO: [
        "Ler os padrões do adversário",
        "Identificar o golpe preferido do adversário",
        "Escolher entre atacar primeiro e contra-atacar",
        "Manter a calma sob pressão no sparring",
        "Ajustar a estratégia entre rounds",
      ],
      TEORICO: [
        "Estilos de boxeador: pressão, boxeador de distância, contra-atacante",
        "Diferenças entre lutar com destros e canhotos",
        "Gestão emocional no combate",
      ],
      FISICO: [
        "Sparring de 4 rounds de 2 minutos",
        "Potência de golpes (saco pesado, medicine ball)",
        "Resistência aeróbica de base (corrida contínua)",
        "Velocidade de saída e de entrada",
      ],
    },
  },
  {
    name: "Azul/Roxo",
    subtitle: "Transição Estratégica",
    motto: "Eu conecto.",
    objective: "Encadeamento com intenção, quebra de ritmo e armadilhas; trabalho de corpo e ângulos.",
    colors: [C.azulCeleste, C.roxo],
    minMonths: 6,
    axes: {
      TECNICO: [
        "Combinações longas com mudança de nível e de ângulo",
        "Golpes ao corpo em curta distância",
        "Ângulos de ataque (pivot, passo lateral, L-step)",
        "Trabalho em curta distância (infighting)",
        "Contra-ataque em retirada",
      ],
      TATICO: [
        "Quebrar o ritmo do adversário",
        "Armar armadilhas (mostrar um golpe para abrir outro)",
        "Cortar o ringue a um adversário que foge",
        "Sair das cordas e do canto sem sofrer",
      ],
      TEORICO: [
        "Princípios do encadeamento: preparação, golpe principal, saída",
        "Análise de combates de referência",
        "Nutrição e hidratação para treino",
      ],
      FISICO: [
        "Sparring de 5 rounds de 2 minutos",
        "Resistência anaeróbica lática (rounds de alta intensidade)",
        "Força explosiva (pliometria)",
        "Estabilidade de core sob impacto",
      ],
    },
  },
  {
    name: "Roxo",
    subtitle: "Transmutação e Sabedoria",
    motto: "Eu adapto.",
    objective: "Identidade própria de luta e refinamento técnico de todos os golpes e defesas.",
    colors: [C.roxo],
    minMonths: 8,
    axes: {
      TECNICO: [
        "Refinamento biomecânico dos 6 golpes",
        "Defesa com o corpo (rolar, puxar, esquivar) em cadeia",
        "Guarda adaptada ao estilo próprio (ex.: Philly shell, guarda alta)",
        "Golpes com timing (contra no momento certo)",
        "Golpear em movimento",
      ],
      TATICO: [
        "Construir uma identidade de luta",
        "Adaptar o estilo a cada adversário",
        "Plano A e plano B para o combate",
        "Gestão de energia ao longo de vários rounds",
      ],
      TEORICO: [
        "História do boxe e grandes referências",
        "Regras de competição (amador e profissional)",
        "Preparação mental para o combate",
      ],
      FISICO: [
        "Sparring de 6 rounds de 2 minutos",
        "Velocidade e potência em combinação",
        "Resistência específica de combate completo",
        "Prevenção de lesões (ombros, mãos, punhos)",
      ],
    },
  },
  {
    name: "Roxo/Verde Limão",
    subtitle: "Inovação e Dinamismo",
    motto: "Eu crio.",
    objective: "Alta performance, explosão e preparação competitiva.",
    colors: [C.roxo, C.verdeLimao],
    minMonths: 8,
    requirements: ["Fazer curso intra-corpus de treinador"],
    axes: {
      TECNICO: [
        "Combinações explosivas em alta velocidade",
        "Contra-ataques compostos (2 ou mais golpes)",
        "Criação de combinações próprias",
        "Ajuste técnico durante o combate",
      ],
      TATICO: [
        "Estratégia de round: como ganhar cada round",
        "Estudo do adversário antes do combate",
        "Pressão controlada e controlo do ringue",
        "Decisões sob fadiga",
      ],
      TEORICO: [
        "Periodização do treino para competição",
        "Corte de peso seguro e categorias",
        "Função do corner e instruções entre rounds",
      ],
      FISICO: [
        "Preparação física de competição",
        "Potência máxima de golpe",
        "Recuperação entre treinos intensos",
        "Simulação de combate completo",
      ],
    },
  },
  {
    name: "Verde Limão/Preto",
    subtitle: "Força Vital Lapidada",
    motto: "Eu lidero.",
    objective: "Preparação para maestria, mentoria e liderança técnica no boxe.",
    notes:
      "No físico, o foco deixa de ser apenas o próprio desempenho: o aluno deve compreender e conseguir prescrever cada capacidade física.",
    colors: [C.verdeLimao, C.preto],
    minMonths: 12,
    requirements: ["Ter feito estágio conosco"],
    axes: {
      TECNICO: [
        "Demonstração metodológica dos golpes e defesas",
        "Explicação biomecânica",
        "Identificação e correção de erros",
        "Manopla de treinador",
        "Construção de rounds de manopla",
        "Simulação de adversários na manopla",
        "Adaptação do treino ao atleta",
      ],
      TATICO: [
        "Leitura de corner",
        "Instruções entre rounds",
        "Análise de combate",
        "Construção de plano de combate e plano alternativo",
        "Desenvolvimento da inteligência tática de outros atletas",
      ],
      TEORICO: [
        "Didática e pedagogia",
        "Ensino de iniciantes, crianças e atletas",
        "Gestão de turmas",
        "Primeiros socorros aplicados ao boxe",
        "Planeamento de treino",
        "Avaliação de atletas",
      ],
      FISICO: [
        "Prescrever força e potência",
        "Prescrever velocidade e resistência",
        "Condicionamento específico de boxe",
        "Controlo de carga e recuperação",
        "Preparação física individualizada",
      ],
    },
  },
  {
    name: "Preto/Prata/Branco/Vermelho",
    subtitle: "Domínio do Reino",
    motto: "Eu formo.",
    objective:
      "Mestre / Professor / Treinador Kingdom Fight de Boxe. Não avaliamos apenas um atleta, mas alguém capaz de preservar, ensinar, desenvolver e evoluir o sistema Kingdom Fight.",
    notes:
      "Os quatro elementos da graduação máxima:\n" +
      "⚫ Preto — Autoridade: autoridade moral e técnica.\n" +
      "⚙️ Prata — Precisão: ciência, tecnologia, dados e refinamento contínuo.\n" +
      "⚪ Branco — Humildade: mentalidade de eterno aprendiz.\n" +
      "🔴 Vermelho — Paixão e Honra: guardião da cultura, da paixão, da honra e da lealdade ao Reino.",
    colors: [C.preto, C.prata, C.branco, C.vermelho],
    minMonths: 24,
    requirements: ["Ter feito os cursos Kingdom de treinador e de atletas"],
    axes: {
      TECNICO: [
        "Domínio do acervo técnico de boxe da escola",
        "Adaptar técnicas a qualquer perfil de atleta",
        "Criação de progressões pedagógicas",
        "Formação de outros professores",
      ],
      TATICO: [
        "Visão completa do combate: técnica, tática, física e psicológica",
        "Estratégia competitiva e análise de adversários",
        "Desenvolvimento de atletas de competição",
        "Formar treinadores capazes de pensar taticamente",
      ],
      TEORICO: [
        "Filosofia e cultura Kingdom",
        "Metodologia e ciência do treino",
        "Biomecânica e fisiologia",
        "Psicologia do atleta",
        "Gestão de atletas e professores",
        "Ética marcial",
      ],
      FISICO: [
        "Conhecer e desenvolver todas as capacidades físicas do boxeador",
        "Gestão de carga e prevenção de lesões",
        "Individualização do treino",
      ],
    },
  },
];
