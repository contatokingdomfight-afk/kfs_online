/**
 * Conteúdo das páginas públicas de modalidades (/modalidades e /modalidades/[slug]).
 * Mesmo padrão de lib/home-content.ts: objeto bilingue, sem chamadas a BD.
 */

export type ModalidadesLocale = "pt" | "en";
export type ModalidadeSlug = "muay-thai" | "boxe" | "jiu-jitsu" | "kids";

export type ModalidadeBenefit = { icon: string; title: string; desc: string };
export type ModalidadeFaqItem = { q: string; a: string };

export type ModalidadeContent = {
  slug: ModalidadeSlug;
  icon: string;
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

const MODALIDADES_ORDER: readonly ModalidadeSlug[] = ["muay-thai", "boxe", "jiu-jitsu", "kids"];

const modalidadesContentData: Record<
  ModalidadesLocale,
  { hub: ModalidadesHubContent; items: Record<ModalidadeSlug, ModalidadeContent> }
> = {
  pt: {
    hub: {
      metaTitle: "Modalidades | Muay Thai, Boxe, Jiu-Jitsu e Kids | Kingdom Fight School",
      metaDescription:
        "Conheça as modalidades da Kingdom Fight School: Muay Thai, Boxe, Jiu-Jitsu e Kids. Aulas estruturadas por nível, treinadores experientes, em Oeiras e Cascais.",
      metaKeywords: ["modalidades", "Muay Thai", "Boxe", "Jiu-Jitsu", "Kids", "artes marciais", "Kingdom Fight", "Oeiras", "Cascais"],
      heroTitle: "As nossas modalidades",
      heroSubtitle:
        "Quatro caminhos, uma só metodologia. Escolha a arte marcial que mais se identifica consigo — ou combine mais do que uma.",
      cardCta: "Conhecer",
      ctaHeadline: "Ainda não sabe qual escolher?",
      ctaSub: "Marque uma aula experimental gratuita e experimente na prática, sem compromisso.",
      ctaButton: "Aula Experimental",
    },
    items: {
      "muay-thai": {
        slug: "muay-thai",
        icon: "🦵",
        name: "Muay Thai",
        tagline: "A arte das oito armas",
        metaTitle: "Muay Thai em Oeiras e Cascais | Kingdom Fight School",
        metaDescription:
          "Aulas de Muay Thai para todos os níveis em Oeiras e Cascais. Socos, cotovelos, joelhos e chutes — condicionamento físico completo e defesa pessoal real.",
        metaKeywords: ["Muay Thai", "Muay Thai Oeiras", "Muay Thai Cascais", "boxe tailandês", "artes marciais", "Kingdom Fight School"],
        heroTitle: "Muay Thai",
        heroSubtitle:
          "Conhecida como a \"arte das oito armas\", o Muay Thai combina socos, cotovelos, joelhos e chutes num dos sistemas de combate mais completos e eficazes que existem.",
        introTitle: "O que é o Muay Thai",
        introText:
          "Originário da Tailândia, o Muay Thai é uma arte marcial de combate em pé (striking) que trabalha todo o corpo como arma. Ao contrário de modalidades que usam apenas as mãos ou apenas os pés, aqui treina-se o corpo inteiro: punhos, cotovelos, joelhos, canelas e o clinch. Nas nossas aulas, a técnica vem sempre primeiro — trabalhamos postura, deslocamento e cada arma de forma isolada antes de as combinar em sequências reais, sempre com acompanhamento próximo do treinador e progressão adaptada ao seu nível.",
        benefitsTitle: "Porquê treinar Muay Thai",
        benefits: [
          {
            icon: "🦵",
            title: "Domínio de 8 armas",
            desc: "Socos, cotovelos, joelhos e chutes: a arte das oito armas trabalha o corpo todo, não só braços ou pernas.",
          },
          {
            icon: "🔥",
            title: "Condicionamento brutal",
            desc: "Queima calórica elevada, resistência cardiovascular e força funcional em cada treino — sem precisar de ginásio à parte.",
          },
          {
            icon: "🛡️",
            title: "Defesa pessoal real",
            desc: "Técnicas eficazes de clinch e combate à curta e média distância, testadas em contexto competitivo há séculos.",
          },
          {
            icon: "🤝",
            title: "Disciplina e evolução",
            desc: "Aulas estruturadas por nível, com o seu progresso acompanhado na plataforma — avaliações, presenças e conquistas.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para quem procura um treino físico exigente e, ao mesmo tempo, uma arte marcial completa. Não é preciso experiência prévia — as turmas são organizadas por nível, do iniciante ao avançado, e cada treino combina técnica, condicionamento e aplicação prática.",
        faqTitle: "Perguntas frequentes",
        faqItems: [
          {
            q: "Preciso de experiência prévia para começar?",
            a: "Não. As turmas de iniciante ensinam tudo desde a base — postura, deslocamento e as técnicas fundamentais — antes de avançar para combinações e clinch.",
          },
          {
            q: "Que equipamento preciso para a primeira aula?",
            a: "Para experimentar, basta roupa de treino confortável. Se decidir continuar, a equipa ajuda a escolher ligaduras, luvas e caneleiras adequadas ao seu nível.",
          },
          {
            q: "É uma modalidade segura para iniciantes?",
            a: "Sim. O contacto é sempre controlado e progressivo, adaptado à experiência de cada aluno, com supervisão constante do treinador.",
          },
        ],
        ctaHeadline: "Pronto para experimentar Muay Thai?",
        ctaSub: "Marque já a sua aula experimental gratuita — sem compromisso.",
        ctaButton: "Aula Experimental",
      },
      boxe: {
        slug: "boxe",
        icon: "🥊",
        name: "Boxe",
        tagline: "A arte nobre",
        metaTitle: "Boxe em Oeiras e Cascais | Kingdom Fight School",
        metaDescription:
          "Aulas de Boxe para todos os níveis em Oeiras e Cascais. Fundamentos técnicos, jogo de pés e um dos treinos cardio mais completos que existem.",
        metaKeywords: ["Boxe", "Boxe Oeiras", "Boxe Cascais", "boxing", "artes marciais", "Kingdom Fight School"],
        heroTitle: "Boxe",
        heroSubtitle:
          "Conhecido como \"a arte nobre\", o Boxe é a base técnica de qualquer lutador: trabalho de punhos, jogo de pés e um dos treinos cardiovasculares mais exigentes que existem.",
        introTitle: "O que é o Boxe",
        introText:
          "O Boxe é uma modalidade de combate focada exclusivamente no trabalho de punhos — jab, cross, hook e uppercut — combinado com footwork, esquiva e controlo de distância. É frequentemente a base técnica de outras artes marciais de striking, precisamente por exigir precisão, timing e disciplina acima de força bruta. Nas nossas aulas, trabalhamos a técnica isoladamente (saco, aparelhos, sombra) antes de aplicar em combinações e sparring controlado, sempre com progressão adaptada ao nível de cada aluno.",
        benefitsTitle: "Porquê treinar Boxe",
        benefits: [
          {
            icon: "🥊",
            title: "Fundamentos sólidos",
            desc: "Jab, cross, hook, uppercut: a base técnica de qualquer lutador começa nos punhos, trabalhada com rigor desde o primeiro dia.",
          },
          {
            icon: "👟",
            title: "Jogo de pés e reflexos",
            desc: "Footwork, esquiva e timing que melhoram a coordenação motora e a leitura de movimento do adversário.",
          },
          {
            icon: "💪",
            title: "Cardio de alta intensidade",
            desc: "Um dos treinos mais completos para queima calórica, resistência e explosão muscular.",
          },
          {
            icon: "🧠",
            title: "Foco mental",
            desc: "Estratégia, leitura de adversário e controlo emocional sob pressão — dentro e fora do ringue.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para quem quer um treino tecnicamente exigente e um dos melhores condicionamentos físicos que existem. Turmas organizadas por nível — não é preciso experiência prévia, apenas vontade de aprender os fundamentos com rigor.",
        faqTitle: "Perguntas frequentes",
        faqItems: [
          {
            q: "Preciso de experiência prévia para começar?",
            a: "Não. Começamos sempre pelos fundamentos — postura, jab, footwork — antes de avançar para combinações mais complexas.",
          },
          {
            q: "Que equipamento preciso para a primeira aula?",
            a: "Roupa de treino confortável chega para experimentar. Se continuar, ajudamos a escolher ligaduras e luvas adequadas.",
          },
          {
            q: "Há sparring desde o início?",
            a: "Não. O sparring só é introduzido de forma gradual e controlada, quando o aluno já domina os fundamentos técnicos e defensivos.",
          },
        ],
        ctaHeadline: "Pronto para experimentar Boxe?",
        ctaSub: "Marque já a sua aula experimental gratuita — sem compromisso.",
        ctaButton: "Aula Experimental",
      },
      "jiu-jitsu": {
        slug: "jiu-jitsu",
        icon: "🤼",
        name: "Jiu-Jitsu",
        tagline: "A arte suave",
        metaTitle: "Jiu-Jitsu em Oeiras e Cascais | Kingdom Fight School",
        metaDescription:
          "Aulas de Jiu-Jitsu para todos os níveis em Oeiras e Cascais. Técnica e alavancagem sobre força bruta — o xadrez físico das artes marciais.",
        metaKeywords: ["Jiu-Jitsu", "Jiu-Jitsu Oeiras", "Jiu-Jitsu Cascais", "BJJ", "artes marciais", "Kingdom Fight School"],
        heroTitle: "Jiu-Jitsu",
        heroSubtitle:
          "Conhecido como \"a arte suave\", o Jiu-Jitsu prova que técnica e alavancagem podem sobrepor-se à força bruta — o verdadeiro xadrez físico das artes marciais.",
        introTitle: "O que é o Jiu-Jitsu",
        introText:
          "O Jiu-Jitsu é uma arte marcial focada no combate no solo — quedas, passagem de guarda, controlo posicional e finalizações (chaves e estrangulamentos). O princípio central é que tamanho e força não decidem o combate: com alavancagem, timing e técnica correta, é possível controlar e submeter um adversário maior. Nas nossas aulas trabalhamos progressão por posições, desde os fundamentos (guarda, mount, passagem) até finalizações, com drilling técnico e sparring controlado (rolling) adaptado ao nível de cada aluno.",
        benefitsTitle: "Porquê treinar Jiu-Jitsu",
        benefits: [
          {
            icon: "🧩",
            title: "Técnica acima da força",
            desc: "Alavancagem e posicionamento sobrepõem-se à força bruta — tamanho não decide o combate.",
          },
          {
            icon: "🤼",
            title: "Domínio no chão",
            desc: "Quedas, passagem de guarda e finalizações: controlo total do combate em qualquer posição.",
          },
          {
            icon: "🧠",
            title: "Xadrez físico",
            desc: "Desenvolve raciocínio tático, paciência e resolução de problemas em tempo real, sob pressão.",
          },
          {
            icon: "👨‍👩‍👧‍👦",
            title: "Para todas as idades",
            desc: "Modalidade adaptável, dos mais novos aos adultos, com progressão de faixas e níveis bem definida.",
          },
        ],
        forWhomTitle: "Para quem é",
        forWhomText:
          "Para quem procura uma arte marcial mais técnica e estratégica, com menor exigência de impacto direto do que as modalidades de striking. Adequado a todas as idades e níveis de condição física — o progresso é medido pela técnica, não pela força.",
        faqTitle: "Perguntas frequentes",
        faqItems: [
          {
            q: "Preciso de experiência prévia para começar?",
            a: "Não. As turmas de iniciante ensinam as posições fundamentais — guarda, mount, passagem — antes de introduzir finalizações.",
          },
          {
            q: "Que equipamento preciso para a primeira aula?",
            a: "Para experimentar, roupa de treino confortável é suficiente. Para continuar, vai precisar de um kimono (gi) ou equipamento no-gi, conforme a turma.",
          },
          {
            q: "É preciso força física para praticar?",
            a: "Não é o factor decisivo. O princípio do Jiu-Jitsu é precisamente permitir que a técnica e a alavancagem superem a força bruta.",
          },
        ],
        ctaHeadline: "Pronto para experimentar Jiu-Jitsu?",
        ctaSub: "Marque já a sua aula experimental gratuita — sem compromisso.",
        ctaButton: "Aula Experimental",
      },
      kids: {
        slug: "kids",
        icon: "🧒",
        name: "Kids",
        tagline: "Disciplina, confiança e diversão desde cedo",
        metaTitle: "Kids — Artes Marciais para Crianças em Oeiras e Cascais | Kingdom Fight School",
        metaDescription:
          "Aulas de artes marciais para crianças em Oeiras e Cascais. Disciplina, confiança, coordenação motora e respeito, num ambiente seguro e divertido.",
        metaKeywords: [
          "Kids",
          "artes marciais para crianças",
          "Muay Thai crianças",
          "desporto de combate infantil",
          "Kingdom Fight School",
          "Oeiras",
          "Cascais",
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
            icon: "🧠",
            title: "Disciplina e foco",
            desc: "Rotina, regras claras e atenção sustentada que se refletem na escola e em casa, não só no tapete.",
          },
          {
            icon: "💪",
            title: "Desenvolvimento motor",
            desc: "Coordenação, equilíbrio, força e agilidade trabalhados numa fase crucial do crescimento.",
          },
          {
            icon: "🛡️",
            title: "Confiança e autodefesa",
            desc: "Aprender a proteger-se e a ganhar segurança em si próprio — uma ferramenta real contra o bullying.",
          },
          {
            icon: "🤝",
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
      },
    },
  },
  en: {
    hub: {
      metaTitle: "Martial Arts Programs | Muay Thai, Boxing, Jiu-Jitsu & Kids | Kingdom Fight School",
      metaDescription:
        "Discover Kingdom Fight School's programs: Muay Thai, Boxing, Jiu-Jitsu and Kids. Level-based classes, experienced coaches, in Oeiras and Cascais, Portugal.",
      metaKeywords: ["martial arts", "Muay Thai", "Boxing", "Jiu-Jitsu", "Kids", "Kingdom Fight", "Oeiras", "Cascais"],
      heroTitle: "Our martial arts programs",
      heroSubtitle:
        "Four paths, one methodology. Choose the martial art that fits you best — or combine more than one.",
      cardCta: "Learn more",
      ctaHeadline: "Not sure which one to choose?",
      ctaSub: "Book a free trial class and try it in practice, no commitment.",
      ctaButton: "Free Trial Class",
    },
    items: {
      "muay-thai": {
        slug: "muay-thai",
        icon: "🦵",
        name: "Muay Thai",
        tagline: "The art of eight limbs",
        metaTitle: "Muay Thai in Oeiras and Cascais | Kingdom Fight School",
        metaDescription:
          "Muay Thai classes for all levels in Oeiras and Cascais. Punches, elbows, knees and kicks — complete physical conditioning and real self-defense.",
        metaKeywords: ["Muay Thai", "Muay Thai Oeiras", "Muay Thai Cascais", "Thai boxing", "martial arts", "Kingdom Fight School"],
        heroTitle: "Muay Thai",
        heroSubtitle:
          "Known as the \"art of eight limbs\", Muay Thai combines punches, elbows, knees and kicks into one of the most complete and effective combat systems in existence.",
        introTitle: "What is Muay Thai",
        introText:
          "Originating in Thailand, Muay Thai is a striking martial art that trains the whole body as a weapon. Unlike disciplines that rely on hands or feet alone, here you train fists, elbows, knees, shins and the clinch. In our classes, technique always comes first — we work on stance, footwork and each weapon individually before combining them into real sequences, always with close coaching and progression adapted to your level.",
        benefitsTitle: "Why train Muay Thai",
        benefits: [
          {
            icon: "🦵",
            title: "Eight weapons, one body",
            desc: "Punches, elbows, knees and kicks: the art of eight limbs trains the whole body, not just arms or legs.",
          },
          {
            icon: "🔥",
            title: "Brutal conditioning",
            desc: "High calorie burn, cardiovascular endurance and functional strength in every session — no separate gym needed.",
          },
          {
            icon: "🛡️",
            title: "Real self-defense",
            desc: "Effective clinch and close/mid-range combat techniques, proven in competition for centuries.",
          },
          {
            icon: "🤝",
            title: "Discipline and progress",
            desc: "Level-based classes, with your progress tracked on the platform — evaluations, attendance and achievements.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For anyone looking for a demanding physical workout and a complete martial art at once. No prior experience needed — classes are organized by level, from beginner to advanced, and every session combines technique, conditioning and practical application.",
        faqTitle: "Frequently asked questions",
        faqItems: [
          {
            q: "Do I need prior experience to start?",
            a: "No. Beginner classes teach everything from the basics — stance, footwork and fundamental techniques — before moving on to combinations and clinch work.",
          },
          {
            q: "What equipment do I need for my first class?",
            a: "Comfortable training clothes are enough to try it out. If you decide to continue, our team helps you choose hand wraps, gloves and shin guards suited to your level.",
          },
          {
            q: "Is it safe for beginners?",
            a: "Yes. Contact is always controlled and progressive, adapted to each student's experience, with constant coach supervision.",
          },
        ],
        ctaHeadline: "Ready to try Muay Thai?",
        ctaSub: "Book your free trial class now — no commitment.",
        ctaButton: "Free Trial Class",
      },
      boxe: {
        slug: "boxe",
        icon: "🥊",
        name: "Boxing",
        tagline: "The sweet science",
        metaTitle: "Boxing in Oeiras and Cascais | Kingdom Fight School",
        metaDescription:
          "Boxing classes for all levels in Oeiras and Cascais. Technical fundamentals, footwork and one of the most complete cardio workouts there is.",
        metaKeywords: ["Boxing", "Boxing Oeiras", "Boxing Cascais", "martial arts", "Kingdom Fight School"],
        heroTitle: "Boxing",
        heroSubtitle:
          "Known as \"the sweet science\", Boxing is the technical foundation of any fighter: punching mechanics, footwork and one of the most demanding cardiovascular workouts there is.",
        introTitle: "What is Boxing",
        introText:
          "Boxing is a combat discipline focused exclusively on punching — jab, cross, hook and uppercut — combined with footwork, head movement and distance control. It's often the technical base of other striking martial arts, precisely because it demands precision, timing and discipline over raw power. In our classes, we work technique in isolation (bag, pads, shadow boxing) before applying it in combinations and controlled sparring, always with progression adapted to each student's level.",
        benefitsTitle: "Why train Boxing",
        benefits: [
          {
            icon: "🥊",
            title: "Solid fundamentals",
            desc: "Jab, cross, hook, uppercut: any fighter's technical base starts with the hands, drilled with rigor from day one.",
          },
          {
            icon: "👟",
            title: "Footwork and reflexes",
            desc: "Footwork, head movement and timing that improve motor coordination and reading your opponent's movement.",
          },
          {
            icon: "💪",
            title: "High-intensity cardio",
            desc: "One of the most complete workouts for calorie burn, endurance and explosive strength.",
          },
          {
            icon: "🧠",
            title: "Mental focus",
            desc: "Strategy, reading your opponent and emotional control under pressure — inside and outside the ring.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For anyone who wants a technically demanding workout and one of the best physical conditioning programs there is. Classes organized by level — no prior experience needed, just the willingness to learn the fundamentals with rigor.",
        faqTitle: "Frequently asked questions",
        faqItems: [
          {
            q: "Do I need prior experience to start?",
            a: "No. We always start with the fundamentals — stance, jab, footwork — before moving to more complex combinations.",
          },
          {
            q: "What equipment do I need for my first class?",
            a: "Comfortable training clothes are enough to try it out. If you continue, we help you choose suitable hand wraps and gloves.",
          },
          {
            q: "Is there sparring from day one?",
            a: "No. Sparring is only introduced gradually and under control, once the student has mastered the technical and defensive fundamentals.",
          },
        ],
        ctaHeadline: "Ready to try Boxing?",
        ctaSub: "Book your free trial class now — no commitment.",
        ctaButton: "Free Trial Class",
      },
      "jiu-jitsu": {
        slug: "jiu-jitsu",
        icon: "🤼",
        name: "Jiu-Jitsu",
        tagline: "The gentle art",
        metaTitle: "Jiu-Jitsu in Oeiras and Cascais | Kingdom Fight School",
        metaDescription:
          "Jiu-Jitsu classes for all levels in Oeiras and Cascais. Technique and leverage over raw strength — the physical chess of martial arts.",
        metaKeywords: ["Jiu-Jitsu", "BJJ", "Jiu-Jitsu Oeiras", "Jiu-Jitsu Cascais", "martial arts", "Kingdom Fight School"],
        heroTitle: "Jiu-Jitsu",
        heroSubtitle:
          "Known as \"the gentle art\", Jiu-Jitsu proves that technique and leverage can overcome raw strength — the true physical chess of martial arts.",
        introTitle: "What is Jiu-Jitsu",
        introText:
          "Jiu-Jitsu is a martial art focused on ground combat — takedowns, guard passing, positional control and submissions (joint locks and chokes). Its central principle is that size and strength don't decide a fight: with leverage, timing and correct technique, you can control and submit a larger opponent. In our classes we work position by position, from the fundamentals (guard, mount, passing) through to submissions, with technical drilling and controlled sparring (rolling) adapted to each student's level.",
        benefitsTitle: "Why train Jiu-Jitsu",
        benefits: [
          {
            icon: "🧩",
            title: "Technique over strength",
            desc: "Leverage and positioning overcome raw strength — size doesn't decide the fight.",
          },
          {
            icon: "🤼",
            title: "Ground mastery",
            desc: "Takedowns, guard passing and submissions: full control of the fight in any position.",
          },
          {
            icon: "🧠",
            title: "Physical chess",
            desc: "Develops tactical thinking, patience and real-time problem solving, under pressure.",
          },
          {
            icon: "👨‍👩‍👧‍👦",
            title: "For all ages",
            desc: "An adaptable discipline, from kids to adults, with a clear belt and level progression system.",
          },
        ],
        forWhomTitle: "Who it's for",
        forWhomText:
          "For anyone looking for a more technical and strategic martial art, with less direct-impact demand than striking disciplines. Suitable for all ages and fitness levels — progress is measured by technique, not strength.",
        faqTitle: "Frequently asked questions",
        faqItems: [
          {
            q: "Do I need prior experience to start?",
            a: "No. Beginner classes teach the fundamental positions — guard, mount, passing — before introducing submissions.",
          },
          {
            q: "What equipment do I need for my first class?",
            a: "Comfortable training clothes are enough to try it out. To continue, you'll need a gi or no-gi gear, depending on the class.",
          },
          {
            q: "Do I need to be physically strong to practice?",
            a: "It's not the deciding factor. Jiu-Jitsu's whole principle is letting technique and leverage overcome raw strength.",
          },
        ],
        ctaHeadline: "Ready to try Jiu-Jitsu?",
        ctaSub: "Book your free trial class now — no commitment.",
        ctaButton: "Free Trial Class",
      },
      kids: {
        slug: "kids",
        icon: "🧒",
        name: "Kids",
        tagline: "Discipline, confidence and fun from an early age",
        metaTitle: "Kids — Martial Arts for Children in Oeiras and Cascais | Kingdom Fight School",
        metaDescription:
          "Martial arts classes for children in Oeiras and Cascais. Discipline, confidence, motor coordination and respect, in a safe and fun environment.",
        metaKeywords: [
          "Kids",
          "martial arts for kids",
          "Muay Thai for children",
          "kids combat sports",
          "Kingdom Fight School",
          "Oeiras",
          "Cascais",
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
            icon: "🧠",
            title: "Discipline and focus",
            desc: "Routine, clear rules and sustained attention that carry over into school and home life, not just the mat.",
          },
          {
            icon: "💪",
            title: "Motor development",
            desc: "Coordination, balance, strength and agility trained during a crucial stage of growth.",
          },
          {
            icon: "🛡️",
            title: "Confidence and self-defense",
            desc: "Learning to protect themselves and gain self-assurance — a real tool against bullying.",
          },
          {
            icon: "🤝",
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
  return MODALIDADES_ORDER.map((slug) => dict.items[slug]);
}

export function isModalidadeSlug(value: string): value is ModalidadeSlug {
  return (MODALIDADES_ORDER as readonly string[]).includes(value);
}

export { MODALIDADES_ORDER };
