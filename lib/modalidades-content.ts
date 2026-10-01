/**
 * Conteúdo das páginas públicas de modalidades.
 * Mesmo padrão de lib/home-content.ts: objeto bilingue, sem chamadas a BD.
 *
 * Muay Thai, Boxe, Kickboxing, Jiu-Jitsu e MMA vivem em páginas de topo
 * (ex. /muay-thai-sintra) para SEO local — ver ModalidadeLandingTemplate.
 * Kids continua em /modalidades/kids (fora de âmbito do projeto de SEO local).
 */

import {
  Swords,
  Zap,
  Move,
  Baby,
  Flame,
  Shield,
  Handshake,
  Footprints,
  Dumbbell,
  Brain,
  Puzzle,
  Users,
  Octagon,
  type LucideIcon,
} from "lucide-react";

export type ModalidadesLocale = "pt" | "en";
export type ModalidadeSlug = "muay-thai" | "boxe" | "kickboxing" | "jiu-jitsu" | "mma" | "kids";

export type ModalidadeBenefit = { icon: LucideIcon; title: string; desc: string };
export type ModalidadeFaqItem = { q: string; a: string };

export type ModalidadeContent = {
  slug: ModalidadeSlug;
  icon: LucideIcon;
  name: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  heroTitle: string;
  heroSubtitle: string;
  introTitle: string;
  introText: string;
  benefitsTitle: string;
  benefits: readonly ModalidadeBenefit[];
  forWhomTitle: string;
  forWhomText: string;
  faqTitle: string;
  faqItems: readonly ModalidadeFaqItem[];
  ctaHeadline: string;
  ctaSub: string;
  ctaButton: string;
  /** URL canónico da página desta modalidade. */
  path: string;
  /** Códigos Lesson.modality a mostrar no horário semanal filtrado desta página. */
  scheduleModalityCodes: readonly string[];
  /** Só true onde é verificadamente verdade que os fundadores dão esta modalidade (Muay Thai, Boxe). */
  showFounders: boolean;
  /** Frase genérica e verdadeira sobre a equipa técnica, usada quando showFounders é false. */
  teamNote?: string;
};

export type ModalidadesHubContent = {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  heroTitle: string;
  heroSubtitle: string;
  cardCta: string;
  ctaHeadline: string;
  ctaSub: string;
  ctaButton: string;
};

/** Todas as modalidades, na ordem do hub /modalidades e do rodapé. */
const MODALIDADES_HUB_ORDER: readonly ModalidadeSlug[] = [
  "muay-thai",
  "boxe",
  "kickboxing",
  "jiu-jitsu",
  "mma",
  "kids",
];

/** Slugs ainda servidos pela rota legada /modalidades/[slug] (só "kids"). */
const MODALIDADES_DYNAMIC_SLUGS: readonly ModalidadeSlug[] = ["kids"];

/** As 5 páginas novas de SEO local, a nível de topo (/muay-thai-sintra, etc.). */
const MODALIDADE_LANDING_SLUGS: readonly ModalidadeSlug[] = [
  "muay-thai",
  "boxe",
  "kickboxing",
  "jiu-jitsu",
  "mma",
];

const modalidadesContentData: Record<
  ModalidadesLocale,
  { hub: ModalidadesHubContent; items: Record<ModalidadeSlug, ModalidadeContent> }
> = {
  pt: {
    hub: {
      metaTitle: "Modalidades | Artes Marciais em Sintra | Kingdom Fight School",
      metaDescription:
        "Conheça as modalidades da Kingdom Fight School, em Algueirão-Mem Martins, Sintra: Muay Thai, Boxe, Kickboxing, Jiu-Jitsu, MMA e Kids. Aulas estruturadas por nível, treinadores experientes.",
      metaKeywords: [
        "modalidades",
        "Muay Thai Sintra",
        "Boxe Sintra",
        "Kickboxing Sintra",
        "Jiu-Jitsu Sintra",
        "MMA Sintra",
        "Kids",
        "artes marciais Sintra",
        "Kingdom Fight",
        "Algueirão-Mem Martins",
      ],
      heroTitle: "As nossas modalidades",
      heroSubtitle:
        "Seis caminhos, uma só metodologia. Escolha a arte marcial que mais se identifica consigo — ou combine mais do que uma.",
      cardCta: "Conhecer",
      ctaHeadline: "Ainda não sabe qual escolher?",
      ctaSub: "Marque uma aula experimental gratuita e experimente na prática, sem compromisso.",
      ctaButton: "Aula Experimental",
    },
    items: {
      "muay-thai": {
        slug: "muay-thai",
        icon: Swords,
        name: "Muay Thai",
        tagline: "A arte das oito armas",
        metaTitle: "Muay Thai em Sintra | Kingdom Fight School",
        metaDescription:
          "Treine Muay Thai em Sintra, em Algueirão-Mem Martins, na Kingdom Fight School. Aulas para iniciantes, praticantes e atletas. Experimente uma aula.",
        metaKeywords: [
          "Muay Thai Sintra",
          "Muay Thai Algueirão-Mem Martins",
          "aulas de Muay Thai Sintra",
          "academia de Muay Thai Sintra",
          "boxe tailandês",
          "artes marciais Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Muay Thai",
        heroSubtitle:
          "Conhecida como a \"arte das oito armas\", o Muay Thai combina socos, cotovelos, joelhos e chutes num dos sistemas de combate mais completos e eficazes que existem.",
        introTitle: "Muay Thai em Algueirão-Mem Martins",
        introText:
          "A Kingdom Fight School fica em Algueirão-Mem Martins, Sintra, e é lá que damos as nossas aulas de Muay Thai. Originário da Tailândia, o Muay Thai é uma arte marcial de combate em pé (striking) que trabalha todo o corpo como arma. Ao contrário de modalidades que usam apenas as mãos ou apenas os pés, aqui treina-se o corpo inteiro: punhos, cotovelos, joelhos, canelas e o clinch. Nas nossas aulas, a técnica vem sempre primeiro — trabalhamos postura, deslocamento e cada arma de forma isolada antes de as combinar em sequências reais, sempre com acompanhamento próximo do treinador e progressão adaptada ao seu nível.",
        benefitsTitle: "Porquê treinar Muay Thai",
        benefits: [
          {
            icon: Swords,
            title: "Domínio de 8 armas",
            desc: "Socos, cotovelos, joelhos e chutes: a arte das oito armas trabalha o corpo todo, não só braços ou pernas.",
          },
          {
            icon: Flame,
            title: "Condicionamento brutal",
            desc: "Queima calórica elevada, resistência cardiovascular e força funcional em cada treino — sem precisar de ginásio à parte.",
          },
          {
            icon: Shield,
            title: "Defesa pessoal real",
            desc: "Técnicas eficazes de clinch e combate à curta e média distância, testadas em contexto competitivo há séculos.",
          },
          {
            icon: Handshake,
            title: "Disciplina e evolução",
            desc: "Aulas estruturadas por nível, com o seu progresso acompanhado na plataforma — avaliações, presenças e conquistas.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para iniciantes, praticantes e atletas que procuram um treino físico exigente e, ao mesmo tempo, uma arte marcial completa. Não é preciso experiência prévia — as turmas são organizadas por nível, do iniciante ao avançado, e cada treino combina técnica, condicionamento e aplicação prática.",
        faqTitle: "Perguntas frequentes sobre Muay Thai",
        faqItems: [
          {
            q: "Preciso de ter experiência para começar Muay Thai?",
            a: "Não. As turmas de iniciante ensinam tudo desde a base — postura, deslocamento e as técnicas fundamentais — antes de avançar para combinações e clinch.",
          },
          {
            q: "O Muay Thai é indicado para iniciantes?",
            a: "Sim. É uma das modalidades mais acessíveis a quem começa do zero, precisamente porque a progressão é feita técnica a técnica, sem pressa.",
          },
          {
            q: "O que preciso de levar para a primeira aula?",
            a: "Para experimentar, basta roupa de treino confortável. Se decidir continuar, a equipa ajuda a escolher ligaduras, luvas e caneleiras adequadas ao seu nível.",
          },
          {
            q: "É uma modalidade segura para iniciantes?",
            a: "Sim. O contacto é sempre controlado e progressivo, adaptado à experiência de cada aluno, com supervisão constante do treinador.",
          },
          {
            q: "Onde ficam as aulas de Muay Thai em Sintra?",
            a: "Na Kingdom Fight School, em Algueirão-Mem Martins, Sintra. Veja a morada e o horário completo nesta página.",
          },
          {
            q: "Posso fazer uma aula experimental de Muay Thai?",
            a: "Sim — a aula experimental é gratuita e sem compromisso. Marque através do botão nesta página.",
          },
          {
            q: "Quanto custa treinar Muay Thai na Kingdom Fight?",
            a: "Os preços dos nossos planos estão listados nesta página. Fale connosco se tiver dúvidas sobre qual se adapta melhor a si.",
          },
        ],
        ctaHeadline: "Pronto para experimentar Muay Thai?",
        ctaSub: "Marque já a sua aula experimental gratuita — sem compromisso.",
        ctaButton: "Aula Experimental",
        path: "/muay-thai-sintra",
        scheduleModalityCodes: ["MUAY_THAI"],
        showFounders: true,
      },
      boxe: {
        slug: "boxe",
        icon: Zap,
        name: "Boxe",
        tagline: "A arte nobre",
        metaTitle: "Boxe em Sintra | Kingdom Fight School",
        metaDescription:
          "Treine Boxe em Sintra, em Algueirão-Mem Martins, na Kingdom Fight School. Fundamentos técnicos, jogo de pés e um dos treinos de cardio mais completos que existem. Experimente uma aula.",
        metaKeywords: [
          "Boxe Sintra",
          "Boxe Algueirão-Mem Martins",
          "aulas de Boxe Sintra",
          "boxing Sintra",
          "artes marciais Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Boxe",
        heroSubtitle:
          "Conhecido como \"a arte nobre\", o Boxe é a base técnica de qualquer lutador: trabalho de punhos, jogo de pés e um dos treinos cardiovasculares mais exigentes que existem.",
        introTitle: "Boxe em Algueirão-Mem Martins",
        introText:
          "A Kingdom Fight School fica em Algueirão-Mem Martins, Sintra, e é lá que damos as nossas aulas de Boxe. O Boxe é uma modalidade de combate focada exclusivamente no trabalho de punhos — jab, cross, hook e uppercut — combinado com footwork, esquiva e controlo de distância. É frequentemente a base técnica de outras artes marciais de striking, precisamente por exigir precisão, timing e disciplina acima de força bruta. Nas nossas aulas, trabalhamos a técnica isoladamente (saco, aparelhos, sombra) antes de aplicar em combinações e sparring controlado, sempre com progressão adaptada ao nível de cada aluno.",
        benefitsTitle: "Porquê treinar Boxe",
        benefits: [
          {
            icon: Zap,
            title: "Fundamentos sólidos",
            desc: "Jab, cross, hook, uppercut: a base técnica de qualquer lutador começa nos punhos, trabalhada com rigor desde o primeiro dia.",
          },
          {
            icon: Footprints,
            title: "Jogo de pés e reflexos",
            desc: "Footwork, esquiva e timing que melhoram a coordenação motora e a leitura de movimento do adversário.",
          },
          {
            icon: Dumbbell,
            title: "Cardio de alta intensidade",
            desc: "Um dos treinos mais completos para queima calórica, resistência e explosão muscular.",
          },
          {
            icon: Brain,
            title: "Foco mental",
            desc: "Estratégia, leitura de adversário e controlo emocional sob pressão — dentro e fora do ringue.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para iniciantes, praticantes e atletas que querem um treino tecnicamente exigente e um dos melhores condicionamentos físicos que existem. Turmas organizadas por nível — não é preciso experiência prévia, apenas vontade de aprender os fundamentos com rigor.",
        faqTitle: "Perguntas frequentes sobre Boxe",
        faqItems: [
          {
            q: "Preciso de ter experiência para começar Boxe?",
            a: "Não. Começamos sempre pelos fundamentos — postura, jab, footwork — antes de avançar para combinações mais complexas.",
          },
          {
            q: "O Boxe é indicado para iniciantes?",
            a: "Sim. As turmas são organizadas por nível e o sparring só entra muito depois dos fundamentos estarem consolidados.",
          },
          {
            q: "O que preciso de levar para a primeira aula?",
            a: "Roupa de treino confortável chega para experimentar. Se continuar, ajudamos a escolher ligaduras e luvas adequadas.",
          },
          {
            q: "Há sparring desde o início?",
            a: "Não. O sparring só é introduzido de forma gradual e controlada, quando o aluno já domina os fundamentos técnicos e defensivos.",
          },
          {
            q: "Onde ficam as aulas de Boxe em Sintra?",
            a: "Na Kingdom Fight School, em Algueirão-Mem Martins, Sintra. Veja a morada e o horário completo nesta página.",
          },
          {
            q: "Posso fazer uma aula experimental de Boxe?",
            a: "Sim — a aula experimental é gratuita e sem compromisso. Marque através do botão nesta página.",
          },
          {
            q: "Quanto custa treinar Boxe na Kingdom Fight?",
            a: "Os preços dos nossos planos estão listados nesta página. Fale connosco se tiver dúvidas sobre qual se adapta melhor a si.",
          },
        ],
        ctaHeadline: "Pronto para experimentar Boxe?",
        ctaSub: "Marque já a sua aula experimental gratuita — sem compromisso.",
        ctaButton: "Aula Experimental",
        path: "/boxe-sintra",
        scheduleModalityCodes: ["BOXING"],
        showFounders: true,
      },
      kickboxing: {
        slug: "kickboxing",
        icon: Flame,
        name: "Kickboxing",
        tagline: "Socos e chutes em alta intensidade",
        metaTitle: "Kickboxing em Sintra | Kingdom Fight School",
        metaDescription:
          "Treine Kickboxing em Sintra, em Algueirão-Mem Martins, na Kingdom Fight School. Socos e chutes a alta intensidade, para todos os níveis. Experimente uma aula.",
        metaKeywords: [
          "Kickboxing Sintra",
          "Kickboxing Algueirão-Mem Martins",
          "aulas de Kickboxing Sintra",
          "artes marciais Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Kickboxing",
        heroSubtitle:
          "Uma modalidade de combate em pé que combina socos e chutes num treino intenso, directo e muito eficaz — técnica e condicionamento físico em cada aula.",
        introTitle: "Kickboxing em Algueirão-Mem Martins",
        introText:
          "A Kingdom Fight School fica em Algueirão-Mem Martins, Sintra, e é lá que damos as nossas aulas de Kickboxing. O Kickboxing combina as técnicas de socos do Boxe com chutes de perna, num sistema de combate em pé mais directo, sem o uso de cotovelos ou joelhos como no Muay Thai. É uma modalidade dinâmica, que exige explosão, resistência e boa leitura de distância. Nas nossas aulas trabalhamos a técnica de forma isolada — socos, chutes, combinações e deslocamento — antes de aplicar em sequências e sparring controlado, com progressão adaptada ao nível de cada aluno.",
        benefitsTitle: "Porquê treinar Kickboxing",
        benefits: [
          {
            icon: Zap,
            title: "Socos e chutes combinados",
            desc: "Uma modalidade completa que junta a técnica de punhos do Boxe aos chutes de perna, sem precisar de experiência prévia em nenhuma das duas.",
          },
          {
            icon: Flame,
            title: "Treino de alta intensidade",
            desc: "Um dos treinos mais exigentes a nível cardiovascular — queima calórica elevada e condicionamento físico completo.",
          },
          {
            icon: Footprints,
            title: "Explosão e mobilidade",
            desc: "Trabalha potência nas pernas, mobilidade de anca e deslocamento, com ganhos visíveis fora do tatame.",
          },
          {
            icon: Handshake,
            title: "Progressão estruturada",
            desc: "Aulas organizadas por nível, com acompanhamento do treinador e evolução visível na plataforma.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para quem procura um treino de combate em pé intenso e directo, sem a curva de aprendizagem do clinch ou dos cotovelos/joelhos do Muay Thai. Turmas organizadas por nível — não é preciso experiência prévia.",
        faqTitle: "Perguntas frequentes sobre Kickboxing",
        faqItems: [
          {
            q: "Preciso de ter experiência para começar Kickboxing?",
            a: "Não. Começamos pelos fundamentos de socos e chutes antes de avançar para combinações mais complexas.",
          },
          {
            q: "O Kickboxing é indicado para iniciantes?",
            a: "Sim. É uma das modalidades mais diretas para começar — sem a curva de aprendizagem de clinch de outras artes marciais.",
          },
          {
            q: "O que preciso de levar para a primeira aula?",
            a: "Roupa de treino confortável chega para experimentar. Para continuar, a equipa ajuda a escolher ligaduras, luvas e caneleiras.",
          },
          {
            q: "Qual é a diferença entre Kickboxing e Muay Thai?",
            a: "O Kickboxing usa apenas socos e chutes de perna; o Muay Thai acrescenta cotovelos, joelhos e clinch. Se gosta de um, é provável que também goste do outro.",
          },
          {
            q: "Onde ficam as aulas de Kickboxing em Sintra?",
            a: "Na Kingdom Fight School, em Algueirão-Mem Martins, Sintra. Veja a morada e o horário completo nesta página.",
          },
          {
            q: "Posso fazer uma aula experimental de Kickboxing?",
            a: "Sim — a aula experimental é gratuita e sem compromisso. Marque através do botão nesta página.",
          },
          {
            q: "Quanto custa treinar Kickboxing na Kingdom Fight?",
            a: "Os preços dos nossos planos estão listados nesta página. Fale connosco se tiver dúvidas sobre qual se adapta melhor a si.",
          },
        ],
        ctaHeadline: "Pronto para experimentar Kickboxing?",
        ctaSub: "Marque já a sua aula experimental gratuita — sem compromisso.",
        ctaButton: "Aula Experimental",
        path: "/kickboxing-sintra",
        scheduleModalityCodes: ["KICKBOXING"],
        showFounders: false,
        teamNote:
          "As aulas de Kickboxing são conduzidas pela equipa técnica da Kingdom Fight School, com acompanhamento próximo e progressão adaptada a cada aluno.",
      },
      "jiu-jitsu": {
        slug: "jiu-jitsu",
        icon: Move,
        name: "Jiu-Jitsu",
        tagline: "A arte suave",
        metaTitle: "Jiu-Jitsu em Sintra | Kingdom Fight School",
        metaDescription:
          "Treine Jiu-Jitsu em Sintra, em Algueirão-Mem Martins, na Kingdom Fight School. Técnica e alavancagem sobre força bruta — o xadrez físico das artes marciais. Experimente uma aula.",
        metaKeywords: [
          "Jiu-Jitsu Sintra",
          "Jiu-Jitsu Algueirão-Mem Martins",
          "BJJ Sintra",
          "artes marciais Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Jiu-Jitsu",
        heroSubtitle:
          "Conhecido como \"a arte suave\", o Jiu-Jitsu prova que técnica e alavancagem podem sobrepor-se à força bruta — o verdadeiro xadrez físico das artes marciais.",
        introTitle: "Jiu-Jitsu em Algueirão-Mem Martins",
        introText:
          "A Kingdom Fight School fica em Algueirão-Mem Martins, Sintra, e é lá que damos as nossas aulas de Jiu-Jitsu. O Jiu-Jitsu é uma arte marcial focada no combate no solo — quedas, passagem de guarda, controlo posicional e finalizações (chaves e estrangulamentos). O princípio central é que tamanho e força não decidem o combate: com alavancagem, timing e técnica correta, é possível controlar e submeter um adversário maior. Nas nossas aulas trabalhamos progressão por posições, desde os fundamentos (guarda, mount, passagem) até finalizações, com drilling técnico e sparring controlado (rolling) adaptado ao nível de cada aluno.",
        benefitsTitle: "Porquê treinar Jiu-Jitsu",
        benefits: [
          {
            icon: Puzzle,
            title: "Técnica acima da força",
            desc: "Alavancagem e posicionamento sobrepõem-se à força bruta — tamanho não decide o combate.",
          },
          {
            icon: Move,
            title: "Domínio no chão",
            desc: "Quedas, passagem de guarda e finalizações: controlo total do combate em qualquer posição.",
          },
          {
            icon: Brain,
            title: "Xadrez físico",
            desc: "Desenvolve raciocínio tático, paciência e resolução de problemas em tempo real, sob pressão.",
          },
          {
            icon: Users,
            title: "Para todas as idades",
            desc: "Modalidade adaptável, dos mais novos aos adultos, com progressão de faixas e níveis bem definida.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para quem procura uma arte marcial mais técnica e estratégica, com menor exigência de impacto direto do que as modalidades de striking. Adequado a todas as idades e níveis de condição física — o progresso é medido pela técnica, não pela força.",
        faqTitle: "Perguntas frequentes sobre Jiu-Jitsu",
        faqItems: [
          {
            q: "Preciso de ter experiência para começar Jiu-Jitsu?",
            a: "Não. As turmas de iniciante ensinam as posições fundamentais — guarda, mount, passagem — antes de introduzir finalizações.",
          },
          {
            q: "O Jiu-Jitsu é indicado para iniciantes?",
            a: "Sim. A progressão é feita por posições, do zero, e o rolling (sparring) é sempre controlado e adaptado ao nível.",
          },
          {
            q: "O que preciso de levar para a primeira aula?",
            a: "Para experimentar, roupa de treino confortável é suficiente. Para continuar, vai precisar de um kimono (gi) ou equipamento no-gi, conforme a turma.",
          },
          {
            q: "É preciso força física para praticar?",
            a: "Não é o fator decisivo. O princípio do Jiu-Jitsu é precisamente permitir que a técnica e a alavancagem superem a força bruta.",
          },
          {
            q: "Onde ficam as aulas de Jiu-Jitsu em Sintra?",
            a: "Na Kingdom Fight School, em Algueirão-Mem Martins, Sintra. Veja a morada e o horário completo nesta página.",
          },
          {
            q: "Posso fazer uma aula experimental de Jiu-Jitsu?",
            a: "Sim — a aula experimental é gratuita e sem compromisso. Marque através do botão nesta página.",
          },
          {
            q: "Quanto custa treinar Jiu-Jitsu na Kingdom Fight?",
            a: "Os preços dos nossos planos estão listados nesta página. Fale connosco se tiver dúvidas sobre qual se adapta melhor a si.",
          },
        ],
        ctaHeadline: "Pronto para experimentar Jiu-Jitsu?",
        ctaSub: "Marque já a sua aula experimental gratuita — sem compromisso.",
        ctaButton: "Aula Experimental",
        path: "/jiu-jitsu-sintra",
        scheduleModalityCodes: ["BJJ"],
        showFounders: false,
        teamNote:
          "As aulas de Jiu-Jitsu são conduzidas pela equipa técnica da Kingdom Fight School, com acompanhamento próximo e progressão por posições adaptada a cada aluno.",
      },
      mma: {
        slug: "mma",
        icon: Octagon,
        name: "MMA",
        tagline: "Striking e chão, numa só arte",
        metaTitle: "MMA em Sintra | Kingdom Fight School",
        metaDescription:
          "MMA na Kingdom Fight School, em Algueirão-Mem Martins, Sintra: treino de competição e cross-training combinando Muay Thai e Jiu-Jitsu. Experimente uma aula.",
        metaKeywords: [
          "MMA Sintra",
          "MMA Algueirão-Mem Martins",
          "treino de MMA Sintra",
          "artes marciais mistas",
          "Kingdom Fight School",
        ],
        heroTitle: "MMA",
        heroSubtitle:
          "O MMA (Artes Marciais Mistas) combina striking e combate no solo. Na Kingdom Fight, o caminho para o MMA passa pelo treino de competição e pelo cross-training entre Muay Thai e Jiu-Jitsu.",
        introTitle: "Como funciona o MMA na Kingdom Fight",
        introText:
          "A Kingdom Fight School fica em Algueirão-Mem Martins, Sintra. Não temos, para já, um currículo fechado e autónomo de MMA — e preferimos dizer isso com clareza em vez de prometer algo que não existe. O que existe hoje é um treino de competição aos sábados, aberto a quem quer juntar as peças de striking e grappling, e a possibilidade de combinar as aulas de Muay Thai e Jiu-Jitsu da escola para construir uma base sólida e real de MMA — exatamente como fazem muitos lutadores, que treinam cada disciplina em separado antes de as juntar no octógono.",
        benefitsTitle: "Porquê este caminho para o MMA",
        benefits: [
          {
            icon: Swords,
            title: "Base real em striking",
            desc: "O Muay Thai dá-lhe a base de socos, cotovelos, joelhos e chutes que qualquer lutador de MMA precisa.",
          },
          {
            icon: Move,
            title: "Base real no chão",
            desc: "O Jiu-Jitsu ensina controlo posicional e finalizações — a diferença entre defender e sobreviver no chão.",
          },
          {
            icon: Users,
            title: "Treino de competição aos sábados",
            desc: "Sessão dedicada a juntar as peças, pensada para quem já tem alguma base nas duas modalidades.",
          },
          {
            icon: Brain,
            title: "Honestidade sobre o programa",
            desc: "Preferimos ser claros: ainda não existe uma turma fechada de MMA — existe um caminho real, construído aula a aula.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para quem já pratica (ou quer começar a praticar) Muay Thai e/ou Jiu-Jitsu na Kingdom Fight e quer juntar as duas bases rumo ao MMA, com o treino de competição de sábado como ponto de encontro.",
        faqTitle: "Perguntas frequentes sobre MMA",
        faqItems: [
          {
            q: "Há uma aula dedicada e completa de MMA?",
            a: "Não, ainda não — e preferimos ser diretos sobre isso. O que existe é o treino de competição aos sábados, mais a possibilidade de combinar Muay Thai e Jiu-Jitsu para construir uma base real de MMA.",
          },
          {
            q: "Preciso de já saber Muay Thai ou Jiu-Jitsu para ir ao treino de sábado?",
            a: "Alguma base ajuda bastante. Fale connosco antes para percebermos o seu nível e sugerirmos o melhor ponto de partida.",
          },
          {
            q: "Posso fazer uma aula experimental antes de decidir o meu caminho?",
            a: "Sim. Pode marcar uma aula experimental de Muay Thai ou Jiu-Jitsu para conhecer a metodologia antes de avançar.",
          },
          {
            q: "Onde fica o treino de competição em Sintra?",
            a: "Na Kingdom Fight School, em Algueirão-Mem Martins, Sintra. Veja a morada e o horário completo nesta página.",
          },
          {
            q: "Quanto custa treinar na Kingdom Fight?",
            a: "Os preços dos nossos planos estão listados nesta página. Fale connosco se tiver dúvidas sobre qual se adapta melhor a si.",
          },
        ],
        ctaHeadline: "Pronto para dar o primeiro passo no MMA?",
        ctaSub: "Marque uma aula experimental de Muay Thai ou Jiu-Jitsu — sem compromisso.",
        ctaButton: "Aula Experimental",
        path: "/mma-sintra",
        scheduleModalityCodes: ["MMA"],
        showFounders: false,
        teamNote:
          "O treino de competição e o cross-training para MMA são acompanhados pela equipa técnica da Kingdom Fight School, combinando a experiência em Muay Thai e Jiu-Jitsu da escola.",
      },
      kids: {
        slug: "kids",
        icon: Baby,
        name: "Kids",
        tagline: "Disciplina, confiança e diversão desde cedo",
        metaTitle: "Kids — Artes Marciais para Crianças em Sintra | Kingdom Fight School",
        metaDescription:
          "Aulas de artes marciais para crianças em Sintra, em Algueirão-Mem Martins. Disciplina, confiança, coordenação motora e respeito, num ambiente seguro e divertido.",
        metaKeywords: [
          "Kids",
          "artes marciais para crianças",
          "Muay Thai crianças",
          "desporto de combate infantil",
          "Kingdom Fight School",
          "Sintra",
          "Algueirão-Mem Martins",
        ],
        heroTitle: "Kids",
        heroSubtitle:
          "Um programa pensado para os mais novos aprenderem artes marciais de forma divertida e segura — disciplina, confiança e respeito que ficam para a vida toda.",
        introTitle: "O que é o programa Kids",
        introText:
          "As aulas Kids adaptam o Muay Thai e outras artes marciais a crianças, com pedagogia própria: exercícios lúdicos, jogos de coordenação e progressão técnica sem contacto pesado. O foco não é competir ou magoar — é ensinar postura, disciplina e trabalho em equipa através do movimento. As turmas são pequenas, o ritmo é adaptado à idade e o treinador acompanha de perto a evolução de cada criança, sempre com muita energia e boa disposição.",
        benefitsTitle: "Porque um desporto de combate faz bem à sua criança",
        benefits: [
          {
            icon: Brain,
            title: "Disciplina e foco",
            desc: "Rotina, regras claras e atenção sustentada que se refletem na escola e em casa, não só no tapete.",
          },
          {
            icon: Dumbbell,
            title: "Desenvolvimento motor",
            desc: "Coordenação, equilíbrio, força e agilidade trabalhados numa fase crucial do crescimento.",
          },
          {
            icon: Shield,
            title: "Confiança e autodefesa",
            desc: "Aprender a proteger-se e a ganhar segurança em si próprio — uma ferramenta real contra o bullying.",
          },
          {
            icon: Handshake,
            title: "Respeito e socialização",
            desc: "Valores como respeito pelo colega e pelo treinador, espírito de equipa e novas amizades a cada aula.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para crianças a partir dos 5-6 anos, sem necessidade de qualquer experiência prévia. As turmas são organizadas por faixa etária e nível, com exercícios adaptados ao desenvolvimento físico e à capacidade de concentração de cada idade.",
        faqTitle: "Perguntas frequentes",
        faqItems: [
          {
            q: "A partir de que idade pode a criança começar?",
            a: "Geralmente a partir dos 5-6 anos. Fale connosco para confirmarmos a turma mais adequada à idade e ao desenvolvimento do seu filho ou filha.",
          },
          {
            q: "Há contacto físico nas aulas?",
            a: "O contacto é sempre muito controlado e adaptado à idade — o foco está na técnica, na coordenação e na disciplina, não em sparring pesado.",
          },
          {
            q: "O meu filho ou filha pode experimentar antes de se inscrever?",
            a: "Sim. Pode marcar uma aula experimental gratuita para a criança conhecer o treinador, a turma e a metodologia antes de decidir continuar.",
          },
        ],
        ctaHeadline: "Pronto para inscrever o seu filho ou filha?",
        ctaSub: "Marque uma aula experimental gratuita e veja como as crianças se divertem a aprender.",
        ctaButton: "Aula Experimental",
        path: "/modalidades/kids",
        scheduleModalityCodes: ["MTKIDS", "BKIDS"],
        showFounders: false,
      },
    },
  },
  en: {
    hub: {
      metaTitle: "Martial Arts Programs in Sintra | Kingdom Fight School",
      metaDescription:
        "Discover Kingdom Fight School's programs, in Algueirão-Mem Martins, Sintra: Muay Thai, Boxing, Kickboxing, Jiu-Jitsu, MMA and Kids. Level-based classes, experienced coaches.",
      metaKeywords: [
        "martial arts programs",
        "Muay Thai Sintra",
        "Boxing Sintra",
        "Kickboxing Sintra",
        "Jiu-Jitsu Sintra",
        "MMA Sintra",
        "Kids",
        "Kingdom Fight",
        "Algueirão-Mem Martins",
      ],
      heroTitle: "Our martial arts programs",
      heroSubtitle:
        "Six paths, one methodology. Choose the martial art that fits you best — or combine more than one.",
      cardCta: "Learn more",
      ctaHeadline: "Not sure which one to choose?",
      ctaSub: "Book a free trial class and try it in practice, no commitment.",
      ctaButton: "Free Trial Class",
    },
    items: {
      "muay-thai": {
        slug: "muay-thai",
        icon: Swords,
        name: "Muay Thai",
        tagline: "The art of eight limbs",
        metaTitle: "Muay Thai in Sintra | Kingdom Fight School",
        metaDescription:
          "Train Muay Thai in Sintra, in Algueirão-Mem Martins, at Kingdom Fight School. Classes for beginners, practitioners and athletes. Try a class.",
        metaKeywords: [
          "Muay Thai Sintra",
          "Muay Thai Algueirão-Mem Martins",
          "Muay Thai classes Sintra",
          "Muay Thai gym Sintra",
          "Thai boxing",
          "martial arts Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Muay Thai",
        heroSubtitle:
          "Known as the \"art of eight limbs\", Muay Thai combines punches, elbows, knees and kicks into one of the most complete and effective combat systems in existence.",
        introTitle: "Muay Thai in Algueirão-Mem Martins",
        introText:
          "Kingdom Fight School is based in Algueirão-Mem Martins, Sintra, and that's where we teach our Muay Thai classes. Originating in Thailand, Muay Thai is a striking martial art that trains the whole body as a weapon. Unlike disciplines that rely on hands or feet alone, here you train fists, elbows, knees, shins and the clinch. In our classes, technique always comes first — we work on stance, footwork and each weapon individually before combining them into real sequences, always with close coaching and progression adapted to your level.",
        benefitsTitle: "Why train Muay Thai",
        benefits: [
          {
            icon: Swords,
            title: "Eight weapons, one body",
            desc: "Punches, elbows, knees and kicks: the art of eight limbs trains the whole body, not just arms or legs.",
          },
          {
            icon: Flame,
            title: "Brutal conditioning",
            desc: "High calorie burn, cardiovascular endurance and functional strength in every session — no separate gym needed.",
          },
          {
            icon: Shield,
            title: "Real self-defense",
            desc: "Effective clinch and close/mid-range combat techniques, proven in competition for centuries.",
          },
          {
            icon: Handshake,
            title: "Discipline and progress",
            desc: "Level-based classes, with your progress tracked on the platform — evaluations, attendance and achievements.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For beginners, practitioners and athletes looking for a demanding physical workout and a complete martial art at once. No prior experience needed — classes are organized by level, from beginner to advanced, and every session combines technique, conditioning and practical application.",
        faqTitle: "Frequently asked questions about Muay Thai",
        faqItems: [
          {
            q: "Do I need experience to start Muay Thai?",
            a: "No. Beginner classes teach everything from the basics — stance, footwork and fundamental techniques — before moving on to combinations and clinch work.",
          },
          {
            q: "Is Muay Thai suitable for beginners?",
            a: "Yes. It's one of the most approachable martial arts to start from zero, precisely because progression is taught technique by technique, without rushing.",
          },
          {
            q: "What do I need to bring to my first class?",
            a: "Comfortable training clothes are enough to try it out. If you decide to continue, our team helps you choose hand wraps, gloves and shin guards suited to your level.",
          },
          {
            q: "Is it safe for beginners?",
            a: "Yes. Contact is always controlled and progressive, adapted to each student's experience, with constant coach supervision.",
          },
          {
            q: "Where are the Muay Thai classes in Sintra?",
            a: "At Kingdom Fight School, in Algueirão-Mem Martins, Sintra. See the address and full schedule on this page.",
          },
          {
            q: "Can I book a Muay Thai trial class?",
            a: "Yes — the trial class is free and with no commitment. Book it using the button on this page.",
          },
          {
            q: "How much does it cost to train Muay Thai at Kingdom Fight?",
            a: "Our plan prices are listed on this page. Get in touch if you have questions about which one fits you best.",
          },
        ],
        ctaHeadline: "Ready to try Muay Thai?",
        ctaSub: "Book your free trial class now — no commitment.",
        ctaButton: "Free Trial Class",
        path: "/muay-thai-sintra",
        scheduleModalityCodes: ["MUAY_THAI"],
        showFounders: true,
      },
      boxe: {
        slug: "boxe",
        icon: Zap,
        name: "Boxing",
        tagline: "The sweet science",
        metaTitle: "Boxing in Sintra | Kingdom Fight School",
        metaDescription:
          "Train Boxing in Sintra, in Algueirão-Mem Martins, at Kingdom Fight School. Technical fundamentals, footwork and one of the most complete cardio workouts there is. Try a class.",
        metaKeywords: [
          "Boxing Sintra",
          "Boxing Algueirão-Mem Martins",
          "Boxing classes Sintra",
          "martial arts Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Boxing",
        heroSubtitle:
          "Known as \"the sweet science\", Boxing is the technical foundation of any fighter: punching mechanics, footwork and one of the most demanding cardiovascular workouts there is.",
        introTitle: "Boxing in Algueirão-Mem Martins",
        introText:
          "Kingdom Fight School is based in Algueirão-Mem Martins, Sintra, and that's where we teach our Boxing classes. Boxing is a combat discipline focused exclusively on punching — jab, cross, hook and uppercut — combined with footwork, head movement and distance control. It's often the technical base of other striking martial arts, precisely because it demands precision, timing and discipline over raw power. In our classes, we work technique in isolation (bag, pads, shadow boxing) before applying it in combinations and controlled sparring, always with progression adapted to each student's level.",
        benefitsTitle: "Why train Boxing",
        benefits: [
          {
            icon: Zap,
            title: "Solid fundamentals",
            desc: "Jab, cross, hook, uppercut: any fighter's technical base starts with the hands, drilled with rigor from day one.",
          },
          {
            icon: Footprints,
            title: "Footwork and reflexes",
            desc: "Footwork, head movement and timing that improve motor coordination and reading your opponent's movement.",
          },
          {
            icon: Dumbbell,
            title: "High-intensity cardio",
            desc: "One of the most complete workouts for calorie burn, endurance and explosive strength.",
          },
          {
            icon: Brain,
            title: "Mental focus",
            desc: "Strategy, reading your opponent and emotional control under pressure — inside and outside the ring.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For beginners, practitioners and athletes who want a technically demanding workout and one of the best physical conditioning programs there is. Classes organized by level — no prior experience needed, just the willingness to learn the fundamentals with rigor.",
        faqTitle: "Frequently asked questions about Boxing",
        faqItems: [
          {
            q: "Do I need experience to start Boxing?",
            a: "No. We always start with the fundamentals — stance, jab, footwork — before moving to more complex combinations.",
          },
          {
            q: "Is Boxing suitable for beginners?",
            a: "Yes. Classes are organized by level and sparring only comes in well after the fundamentals are solid.",
          },
          {
            q: "What do I need to bring to my first class?",
            a: "Comfortable training clothes are enough to try it out. If you continue, we help you choose suitable hand wraps and gloves.",
          },
          {
            q: "Is there sparring from day one?",
            a: "No. Sparring is only introduced gradually and under control, once the student has mastered the technical and defensive fundamentals.",
          },
          {
            q: "Where are the Boxing classes in Sintra?",
            a: "At Kingdom Fight School, in Algueirão-Mem Martins, Sintra. See the address and full schedule on this page.",
          },
          {
            q: "Can I book a Boxing trial class?",
            a: "Yes — the trial class is free and with no commitment. Book it using the button on this page.",
          },
          {
            q: "How much does it cost to train Boxing at Kingdom Fight?",
            a: "Our plan prices are listed on this page. Get in touch if you have questions about which one fits you best.",
          },
        ],
        ctaHeadline: "Ready to try Boxing?",
        ctaSub: "Book your free trial class now — no commitment.",
        ctaButton: "Free Trial Class",
        path: "/boxe-sintra",
        scheduleModalityCodes: ["BOXING"],
        showFounders: true,
      },
      kickboxing: {
        slug: "kickboxing",
        icon: Flame,
        name: "Kickboxing",
        tagline: "High-intensity punches and kicks",
        metaTitle: "Kickboxing in Sintra | Kingdom Fight School",
        metaDescription:
          "Train Kickboxing in Sintra, in Algueirão-Mem Martins, at Kingdom Fight School. High-intensity punches and kicks, for all levels. Try a class.",
        metaKeywords: [
          "Kickboxing Sintra",
          "Kickboxing Algueirão-Mem Martins",
          "Kickboxing classes Sintra",
          "martial arts Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Kickboxing",
        heroSubtitle:
          "A standing combat discipline combining punches and kicks into an intense, direct and highly effective workout — technique and conditioning in every class.",
        introTitle: "Kickboxing in Algueirão-Mem Martins",
        introText:
          "Kingdom Fight School is based in Algueirão-Mem Martins, Sintra, and that's where we teach our Kickboxing classes. Kickboxing combines Boxing's punching techniques with leg kicks, in a more direct standing combat system that doesn't use elbows or knees like Muay Thai. It's a dynamic discipline that demands explosiveness, endurance and good distance management. In our classes we work technique in isolation — punches, kicks, combinations and footwork — before applying it in sequences and controlled sparring, with progression adapted to each student's level.",
        benefitsTitle: "Why train Kickboxing",
        benefits: [
          {
            icon: Zap,
            title: "Punches and kicks combined",
            desc: "A complete discipline that joins Boxing's hand technique with leg kicks, no prior experience in either needed.",
          },
          {
            icon: Flame,
            title: "High-intensity training",
            desc: "One of the most demanding workouts cardiovascularly — high calorie burn and complete physical conditioning.",
          },
          {
            icon: Footprints,
            title: "Explosiveness and mobility",
            desc: "Builds leg power, hip mobility and footwork, with gains that show outside the gym too.",
          },
          {
            icon: Handshake,
            title: "Structured progression",
            desc: "Level-based classes, with coach supervision and visible progress tracked on the platform.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For anyone looking for an intense, direct standing combat workout, without the learning curve of Muay Thai's clinch, elbows or knees. Classes organized by level — no prior experience needed.",
        faqTitle: "Frequently asked questions about Kickboxing",
        faqItems: [
          {
            q: "Do I need experience to start Kickboxing?",
            a: "No. We start with punching and kicking fundamentals before moving to more complex combinations.",
          },
          {
            q: "Is Kickboxing suitable for beginners?",
            a: "Yes. It's one of the most direct disciplines to start with — without the clinch learning curve of other martial arts.",
          },
          {
            q: "What do I need to bring to my first class?",
            a: "Comfortable training clothes are enough to try it out. To continue, our team helps you choose hand wraps, gloves and shin guards.",
          },
          {
            q: "What's the difference between Kickboxing and Muay Thai?",
            a: "Kickboxing only uses punches and leg kicks; Muay Thai adds elbows, knees and clinch. If you like one, you'll likely enjoy the other too.",
          },
          {
            q: "Where are the Kickboxing classes in Sintra?",
            a: "At Kingdom Fight School, in Algueirão-Mem Martins, Sintra. See the address and full schedule on this page.",
          },
          {
            q: "Can I book a Kickboxing trial class?",
            a: "Yes — the trial class is free and with no commitment. Book it using the button on this page.",
          },
          {
            q: "How much does it cost to train Kickboxing at Kingdom Fight?",
            a: "Our plan prices are listed on this page. Get in touch if you have questions about which one fits you best.",
          },
        ],
        ctaHeadline: "Ready to try Kickboxing?",
        ctaSub: "Book your free trial class now — no commitment.",
        ctaButton: "Free Trial Class",
        path: "/kickboxing-sintra",
        scheduleModalityCodes: ["KICKBOXING"],
        showFounders: false,
        teamNote:
          "Kickboxing classes are taught by Kingdom Fight School's coaching team, with close supervision and progression adapted to each student.",
      },
      "jiu-jitsu": {
        slug: "jiu-jitsu",
        icon: Move,
        name: "Jiu-Jitsu",
        tagline: "The gentle art",
        metaTitle: "Jiu-Jitsu in Sintra | Kingdom Fight School",
        metaDescription:
          "Train Jiu-Jitsu in Sintra, in Algueirão-Mem Martins, at Kingdom Fight School. Technique and leverage over raw strength — the physical chess of martial arts. Try a class.",
        metaKeywords: [
          "Jiu-Jitsu Sintra",
          "Jiu-Jitsu Algueirão-Mem Martins",
          "BJJ Sintra",
          "martial arts Sintra",
          "Kingdom Fight School",
        ],
        heroTitle: "Jiu-Jitsu",
        heroSubtitle:
          "Known as \"the gentle art\", Jiu-Jitsu proves that technique and leverage can overcome raw strength — the true physical chess of martial arts.",
        introTitle: "Jiu-Jitsu in Algueirão-Mem Martins",
        introText:
          "Kingdom Fight School is based in Algueirão-Mem Martins, Sintra, and that's where we teach our Jiu-Jitsu classes. Jiu-Jitsu is a martial art focused on ground combat — takedowns, guard passing, positional control and submissions (joint locks and chokes). Its central principle is that size and strength don't decide a fight: with leverage, timing and correct technique, you can control and submit a larger opponent. In our classes we work position by position, from the fundamentals (guard, mount, passing) through to submissions, with technical drilling and controlled sparring (rolling) adapted to each student's level.",
        benefitsTitle: "Why train Jiu-Jitsu",
        benefits: [
          {
            icon: Puzzle,
            title: "Technique over strength",
            desc: "Leverage and positioning overcome raw strength — size doesn't decide the fight.",
          },
          {
            icon: Move,
            title: "Ground mastery",
            desc: "Takedowns, guard passing and submissions: full control of the fight in any position.",
          },
          {
            icon: Brain,
            title: "Physical chess",
            desc: "Develops tactical thinking, patience and real-time problem solving, under pressure.",
          },
          {
            icon: Users,
            title: "For all ages",
            desc: "An adaptable discipline, from kids to adults, with a clear belt and level progression system.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For anyone looking for a more technical and strategic martial art, with less direct-impact demand than striking disciplines. Suitable for all ages and fitness levels — progress is measured by technique, not strength.",
        faqTitle: "Frequently asked questions about Jiu-Jitsu",
        faqItems: [
          {
            q: "Do I need experience to start Jiu-Jitsu?",
            a: "No. Beginner classes teach the fundamental positions — guard, mount, passing — before introducing submissions.",
          },
          {
            q: "Is Jiu-Jitsu suitable for beginners?",
            a: "Yes. Progression is taught position by position, from zero, and rolling (sparring) is always controlled and level-appropriate.",
          },
          {
            q: "What do I need to bring to my first class?",
            a: "Comfortable training clothes are enough to try it out. To continue, you'll need a gi or no-gi gear, depending on the class.",
          },
          {
            q: "Do I need to be physically strong to practice?",
            a: "It's not the deciding factor. Jiu-Jitsu's whole principle is letting technique and leverage overcome raw strength.",
          },
          {
            q: "Where are the Jiu-Jitsu classes in Sintra?",
            a: "At Kingdom Fight School, in Algueirão-Mem Martins, Sintra. See the address and full schedule on this page.",
          },
          {
            q: "Can I book a Jiu-Jitsu trial class?",
            a: "Yes — the trial class is free and with no commitment. Book it using the button on this page.",
          },
          {
            q: "How much does it cost to train Jiu-Jitsu at Kingdom Fight?",
            a: "Our plan prices are listed on this page. Get in touch if you have questions about which one fits you best.",
          },
        ],
        ctaHeadline: "Ready to try Jiu-Jitsu?",
        ctaSub: "Book your free trial class now — no commitment.",
        ctaButton: "Free Trial Class",
        path: "/jiu-jitsu-sintra",
        scheduleModalityCodes: ["BJJ"],
        showFounders: false,
        teamNote:
          "Jiu-Jitsu classes are taught by Kingdom Fight School's coaching team, with close supervision and position-by-position progression adapted to each student.",
      },
      mma: {
        slug: "mma",
        icon: Octagon,
        name: "MMA",
        tagline: "Striking and ground, one art",
        metaTitle: "MMA in Sintra | Kingdom Fight School",
        metaDescription:
          "MMA at Kingdom Fight School, in Algueirão-Mem Martins, Sintra: competition training and cross-training combining Muay Thai and Jiu-Jitsu. Try a class.",
        metaKeywords: [
          "MMA Sintra",
          "MMA Algueirão-Mem Martins",
          "MMA training Sintra",
          "mixed martial arts",
          "Kingdom Fight School",
        ],
        heroTitle: "MMA",
        heroSubtitle:
          "MMA (Mixed Martial Arts) combines striking and ground combat. At Kingdom Fight, the path into MMA is through competition training and cross-training between Muay Thai and Jiu-Jitsu.",
        introTitle: "How MMA works at Kingdom Fight",
        introText:
          "Kingdom Fight School is based in Algueirão-Mem Martins, Sintra. We don't yet have a closed, standalone MMA curriculum — and we'd rather say that clearly than promise something that doesn't exist. What exists today is a Saturday competition-training session, open to anyone wanting to put striking and grappling together, plus the option to combine our Muay Thai and Jiu-Jitsu classes to build a real, solid MMA base — exactly how many fighters train, working each discipline separately before bringing them together in the cage.",
        benefitsTitle: "Why this path into MMA",
        benefits: [
          {
            icon: Swords,
            title: "A real striking base",
            desc: "Muay Thai gives you the punches, elbows, knees and kicks foundation any MMA fighter needs.",
          },
          {
            icon: Move,
            title: "A real ground base",
            desc: "Jiu-Jitsu teaches positional control and submissions — the difference between defending and surviving on the ground.",
          },
          {
            icon: Users,
            title: "Saturday competition training",
            desc: "A session dedicated to putting the pieces together, built for those who already have some base in both disciplines.",
          },
          {
            icon: Brain,
            title: "Honesty about the program",
            desc: "We'd rather be upfront: there isn't a closed MMA class yet — there's a real path, built class by class.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For those who already train (or want to start training) Muay Thai and/or Jiu-Jitsu at Kingdom Fight and want to combine both bases toward MMA, with the Saturday competition training as the meeting point.",
        faqTitle: "Frequently asked questions about MMA",
        faqItems: [
          {
            q: "Is there a dedicated, full MMA class?",
            a: "Not yet — and we'd rather be direct about it. What exists is the Saturday competition training, plus the option to combine Muay Thai and Jiu-Jitsu to build a real MMA base.",
          },
          {
            q: "Do I need to already know Muay Thai or Jiu-Jitsu for the Saturday session?",
            a: "Some base helps a lot. Talk to us beforehand so we can gauge your level and suggest the best starting point.",
          },
          {
            q: "Can I try a class before deciding my path?",
            a: "Yes. You can book a Muay Thai or Jiu-Jitsu trial class to get to know the methodology before moving forward.",
          },
          {
            q: "Where is the competition training in Sintra?",
            a: "At Kingdom Fight School, in Algueirão-Mem Martins, Sintra. See the address and full schedule on this page.",
          },
          {
            q: "How much does it cost to train at Kingdom Fight?",
            a: "Our plan prices are listed on this page. Get in touch if you have questions about which one fits you best.",
          },
        ],
        ctaHeadline: "Ready to take your first step into MMA?",
        ctaSub: "Book a Muay Thai or Jiu-Jitsu trial class — no commitment.",
        ctaButton: "Free Trial Class",
        path: "/mma-sintra",
        scheduleModalityCodes: ["MMA"],
        showFounders: false,
        teamNote:
          "MMA competition training and cross-training are led by Kingdom Fight School's coaching team, combining the school's Muay Thai and Jiu-Jitsu experience.",
      },
      kids: {
        slug: "kids",
        icon: Baby,
        name: "Kids",
        tagline: "Discipline, confidence and fun from an early age",
        metaTitle: "Kids — Martial Arts for Children in Sintra | Kingdom Fight School",
        metaDescription:
          "Martial arts classes for children in Sintra, in Algueirão-Mem Martins. Discipline, confidence, motor coordination and respect, in a safe and fun environment.",
        metaKeywords: [
          "Kids",
          "martial arts for kids",
          "Muay Thai for children",
          "kids combat sports",
          "Kingdom Fight School",
          "Sintra",
          "Algueirão-Mem Martins",
        ],
        heroTitle: "Kids",
        heroSubtitle:
          "A program designed for children to learn martial arts in a fun and safe way — discipline, confidence and respect that last a lifetime.",
        introTitle: "What the Kids program is",
        introText:
          "Kids classes adapt Muay Thai and other martial arts to children, with their own teaching approach: playful exercises, coordination games and technical progression without heavy contact. The focus isn't competing or getting hurt — it's teaching posture, discipline and teamwork through movement. Classes are small, the pace is age-appropriate and the coach closely follows each child's progress, always with plenty of energy and fun.",
        benefitsTitle: "Why a combat sport is good for your child",
        benefits: [
          {
            icon: Brain,
            title: "Discipline and focus",
            desc: "Routine, clear rules and sustained attention that carry over into school and home life, not just the mat.",
          },
          {
            icon: Dumbbell,
            title: "Motor development",
            desc: "Coordination, balance, strength and agility trained during a crucial stage of growth.",
          },
          {
            icon: Shield,
            title: "Confidence and self-defense",
            desc: "Learning to protect themselves and gain self-assurance — a real tool against bullying.",
          },
          {
            icon: Handshake,
            title: "Respect and socializing",
            desc: "Values like respect for teammates and coaches, team spirit and new friendships in every class.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For children from around 5-6 years old, no prior experience needed. Classes are organized by age group and level, with exercises adapted to each age's physical development and attention span.",
        faqTitle: "Frequently asked questions",
        faqItems: [
          {
            q: "What age can my child start?",
            a: "Usually from around 5-6 years old. Get in touch and we'll confirm the right class for your child's age and development.",
          },
          {
            q: "Is there physical contact in class?",
            a: "Contact is always very controlled and age-appropriate — the focus is on technique, coordination and discipline, not heavy sparring.",
          },
          {
            q: "Can my child try a class before enrolling?",
            a: "Yes. You can book a free trial class for your child to meet the coach, the class and the methodology before deciding to continue.",
          },
        ],
        ctaHeadline: "Ready to enroll your child?",
        ctaSub: "Book a free trial class and see how much fun kids have while learning.",
        ctaButton: "Free Trial Class",
        path: "/modalidades/kids",
        scheduleModalityCodes: ["MTKIDS", "BKIDS"],
        showFounders: false,
      },
    },
  },
};

export function getModalidadesHubContent(locale: ModalidadesLocale): ModalidadesHubContent {
  return modalidadesContentData[locale]?.hub ?? modalidadesContentData.pt.hub;
}

export function getModalidadeContent(locale: ModalidadesLocale, slug: ModalidadeSlug): ModalidadeContent {
  const dict = modalidadesContentData[locale] ?? modalidadesContentData.pt;
  return dict.items[slug] ?? modalidadesContentData.pt.items[slug];
}

export function getAllModalidades(locale: ModalidadesLocale): ModalidadeContent[] {
  const dict = modalidadesContentData[locale] ?? modalidadesContentData.pt;
  return MODALIDADES_HUB_ORDER.map((slug) => dict.items[slug]);
}

export function isModalidadeSlug(value: string): value is ModalidadeSlug {
  return (MODALIDADES_HUB_ORDER as readonly string[]).includes(value);
}

/** Guarda específica da rota legada /modalidades/[slug] (só "kids" depois da mudança para URLs de topo). */
export function isModalidadesDynamicRouteSlug(value: string): value is ModalidadeSlug {
  return (MODALIDADES_DYNAMIC_SLUGS as readonly string[]).includes(value);
}

export { MODALIDADES_HUB_ORDER, MODALIDADES_DYNAMIC_SLUGS, MODALIDADE_LANDING_SLUGS };
