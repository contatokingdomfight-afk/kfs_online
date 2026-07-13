/**
 * Conteúdo da Homepage — centralizado para i18n
 * Usar getHomeContent(locale) para obter textos.
 */

export type HomeLocale = "pt" | "en";

export const homeContent = {
  pt: {
    // Header
    headerCta: "Aula Experimental",
    headerTimer: "Timer",
    headerJudging: "Arbitragem",

    // Hero
    heroHeadline1: "Treine com Propósito.",
    heroHeadline2: "Lute com Disciplina.",
    heroSubheadline: "Transforme o seu corpo e mente através das artes marciais. Metodologia Kingdom — onde cada golpe tem significado.",
    ctaStart: "Aula Experimental",
    ctaViewTrainings: "Login",

    // Stats
    statsYears: "20+ anos",
    statsYearsLabel: "de experiência",
    statsStudents: "",
    statsStudentsLabel: "Comunidade em evolução",
    statsMethod: "Metodologia",
    statsMethodLabel: "estruturada",
    statsModalities: "Muay Thai, Boxe, Kickboxing e mais",

    // About
    aboutTitle: "Sobre a Kingdom Fight",
    missionTitle: "Missão",
    missionText: "Formar campeões dentro e fora do tatame, transformando vidas através da disciplina das artes marciais. Integramos tecnologia e ensino técnico de elite para criar lutadores e cidadãos de alta performance.",
    visionTitle: "Visão",
    visionText: "Tornar-nos a maior rede global de ensino marcial integrado, expandindo a metodologia Kingdom de Portugal para a Europa e Américas.",
    purposeTitle: "Propósito",
    purposeText: "Forjar guerreiros completos — corpo, mente e espírito. Guiados por integridade, honra e valores que transcendem o tatame.",

    // How it works
    howTitle: "Como Funciona",
    step1: "Escolha o seu plano",
    step1Desc: "Online, presencial ou combo — o que melhor se adapta a si.",
    step2: "Aceda à plataforma",
    step2Desc: "Calendário, check-in digital e acompanhamento de evolução.",
    step3: "Siga os treinos",
    step3Desc: "Aulas estruturadas por nível e modalidade.",
    step4: "Evolua constantemente",
    step4Desc: "Métricas, feedback do coach e progresso visível.",

    scheduleTitle: "Horários das aulas",
    scheduleSubtitle:
      "Grade semanal nas nossas escolas. Actualizada automaticamente quando alteramos o calendário.",
    scheduleEmptyDay: "Sem aulas",
    scheduleCta: "Marcar aula experimental",
    scheduleFootnote:
      "Horários de referência (aulas semanais). Alterações pontuais ou cancelamentos podem variar — confirma connosco.",
    scheduleNoClasses:
      "Brevemente publicamos os horários. Entre em contacto ou marque uma aula experimental.",

    // Trilhas + Plano digital (landing)
    learningPathsTitle: "Trilhas de aprendizagem",
    learningPathsSubtitle: "Do Iniciante ao Elite",
    learningPathsDesc: "Técnica, mindset e performance — uma biblioteca de cursos para evoluir ao teu ritmo. Não podes fazer aulas presenciais? O plano digital dá-te acesso a todas as trilhas online.",
    learningPathsCta: "Ver planos",

    // Plans
    plansTitle: "Planos",
    planOnline: "Kingdom Básico",
    planOnlinePrice: "€20",
    planOnlinePer: "/mês",
    planOnlineDesc: "Biblioteca digital (cursos e conteúdos). Sem check-in nem acompanhamento presencial.",
    planOnlineAudience: "Só estudo online; não inclui aulas no ginásio.",
    planPresencial1: "Kingdom Presencial I",
    planPresencial1Price: "€55",
    planPresencial1Desc: "Plataforma (check-in, desempenho); sem biblioteca digital (upgrade opcional +20€). Uma aula/dia, uma modalidade.",
    planPresencial1Audience: "Muay Thai, Boxe ou Kickboxing.",
    planPresencial2: "Kingdom Presencial MMA",
    planPresencial2Price: "€80",
    planPresencial2Desc: "Todas as modalidades + plataforma digital. Check-ins ilimitados por dia.",
    planPresencial2Audience: "Multi-modalidades + estudo online.",
    planFull: "Kingdom FULL",
    planFullPrice: "€100",
    planFullDesc: "Acesso ilimitado + digital + brindes e benefícios exclusivos.",
    planFullAudience: "Experiência completa.",
    popular: "Mais Popular",
    planCta: "Começar",

    // YouTube Shorts
    youtubeShortsTitle: "KFS em ação",
    youtubeShortsSubtitle: "Alguns momentos do nosso dia a dia no tatame.",

    symbolismTitle: "O significado do símbolo",
    symbolismSubtitle:
      "Explora cada elemento do nosso logótipo — passa o rato, foca com o teclado ou toca para ler o significado.",
    symbolismHint: "Escolhe um elemento à esquerda ou à direita (ou sobre o logótipo) para ver a explicação.",
    symbolismLogoAlt: "Emblema Kingdom Fight School com octógono, coroa e lutador — áreas interactivas",
    symbolismOctagonTitle: "O octógono",
    symbolismOctagonBody:
      "Representa a arena da realidade: o ambiente de provação, proteção e foco onde o guerreiro se forja.",
    symbolismFighterTitle: "O lutador",
    symbolismFighterBody:
      "O lutador com o punho levantado significa vitória, mas também aprimoramento técnico, disciplina e auto-desenvolvimento.",
    symbolismColorsTitle: "Cores cromáticas",
    symbolismColorsBody:
      "Prata e vermelho transmitem solidez, disciplina, resiliência e durabilidade, com um ar moderno e sofisticado — corpo e mente forjados nos treinos, como metais.",
    symbolismCrownTitle: "A coroa",
    symbolismCrownBody:
      "Representa soberania e nobreza, e a mentalidade de campeão — o «Reino» em Kingdom Fight.",
    symbolismBloodTitle: "Vermelho sangue",
    symbolismBloodBody:
      "Nas pontas da coroa e no nome «Kingdom», representa energia, paixão e agressividade controlada, e a vitalidade para o combate.",
    symbolismProphecyTitle: "Profecia",
    symbolismProphecyBody:
      "«E quando olharem, mesmo que não entendam, vão receber no espírito a profecia de que é pelo sangue do Cordeiro que podemos reinar com o Senhor — e nEle somos mais do que vencedores.»",

    // Why choose
    whyTitle: "Por que a Kingdom Fight",
    why1: "Treinadores experientes",
    why1Desc: "Mestres certificados, anos de tatame.",
    why2: "Método estruturado",
    why2Desc: "Trilhas claras do iniciante ao avançado.",
    why4: "Comunidade forte",
    why4Desc: "Pertencimento e respeito ao templo.",
    why5: "Evolução real",
    why5Desc: "Métricas e acompanhamento do seu progresso.",

    // Testimonials
    testimonialsTitle: "O que dizem os nossos alunos",
    testimonial1: "A Kingdom transformou a minha forma de treinar. Disciplina e propósito em cada aula.",
    testimonial1Name: "Aluno KFS",
    testimonial2: "Metodologia clara, evolução visível. Recomendo a todos.",
    testimonial2Name: "Aluno KFS",
    testimonial3: "Mais do que um ginásio — uma escola de vida.",
    testimonial3Name: "Aluno KFS",

    // CTA final
    ctaHeadline: "A sua transformação começa agora.",
    ctaSub: "Dê o primeiro passo. Aula experimental gratuita.",
    ctaButton: "Começar Agora",

    /** Faixa PWA na homepage — distribuição sem lojas de aplicativos */
    pwaBandTitle: "Plataforma no telemóvel",
    pwaBandSub:
      "Instale um atalho no ecrã inicial — aceda como numa app, com o mesmo login. Sem Google Play ou App Store.",

    // Social
    youtubeUrl: "https://www.youtube.com/@Kingdom_Fight",
    instagramUrl: "https://www.instagram.com/kingdomfightschool",

    // Founders
    foundersTitle: "Os Fundadores",
    foundersSubtitle: "Conheça quem criou a Kingdom Fight",
    foundersVideoTitle: "A história da KFS",
    foundersVideoUrl: "https://www.youtube.com/embed/eQWUG9Q61c4?start=3",
    founder1Name: "Oséias Beu",
    founder1Role: "Co-fundador",
    founder1Image: "/founders/Oseias.png",
    founder1Bio: "Iniciou nas artes marciais ainda jovem, passando pelo Jiu-Jitsu, Boxe e Kickboxing até encontrar no Muay Thai sua principal paixão, onde conquistou o Prajied Preto pelo mestre Márcio Farah, no ginásio Crokodilos em São Paulo. É atleta e treinador de Boxe e Muay Thai. Além da trajetória no desporto de combate, atua como cientista de dados e atualmente é mestrando em Data Science pela NOVA IMS.",
    founder2Name: "Ícaro Bueno",
    founder2Role: "Co-fundador",
    founder2Image: "/founders/Icaro.png",
    founder2Bio: "Iniciou sua jornada nas artes marciais com Capoeira e Boxe e posteriormente passou a ensinar crianças em um projeto social, onde descobriu sua vocação para o ensino. Tornou-se professor de Muay Thai e encontrou sua maior realização em formar atletas, atuar no corner e transmitir princípios e valores através do esporte. Com mais de 20 anos de experiência, recebeu o Prajied Preto em Muay Thai, já desenvolveu diversos atletas que competiram em diferentes níveis.",

    // Footer
    footerLinks: "Links rápidos",
    footerAulaExp: "Aula Experimental",
    footerTimer: "Timer de rounds",
    footerJudging: "Arbitragem",
    footerSignIn: "Entrar",
    footerSignUp: "Criar conta",
    footerTerms: "Termos",
    footerPrivacy: "Privacidade",
    footerContact: "Contacto",
    footerRights: "© Kingdom Fight School. Todos os direitos reservados.",

    // Arbitragem (homepage)
    arbitrationTitle: "Arbitragem na Kingdom",
    arbitrationSubtitle: "Do treino ao evento",
    arbitrationDesc:
      "Julgamento 10-Point Must para boxe e Muay Thai — critérios por round, sugestão automática de placar e ocorrências por atleta. Grátis no telemóvel, sem registo. Na plataforma da escola: vários juízes, histórico de combates e perfis de critérios personalizáveis por evento.",
    arbitrationFeature1: "Grátis e sem conta",
    arbitrationFeature1Desc: "Use em treinos, sparrings ou eventos informais — como o timer de rounds.",
    arbitrationFeature2: "Critérios por round",
    arbitrationFeature2Desc: "Avaliação 1–5 por canto, placar oficial 10-9 e registo de ocorrências.",
    arbitrationFeature3: "Eventos na plataforma",
    arbitrationFeature3Desc: "Múltiplos juízes, resultado oficial, histórico e critérios à medida do evento.",
    arbitrationCtaFree: "Experimentar arbitragem",
    arbitrationCtaPlatform: "Entrar na plataforma",
  },
  en: {
    headerCta: "Trial Class",
    headerTimer: "Timer",
    headerJudging: "Arbitration",

    heroHeadline1: "Train with Purpose.",
    heroHeadline2: "Fight with Discipline.",
    heroSubheadline: "Transform your body and mind through martial arts. Kingdom methodology — where every strike has meaning.",
    ctaStart: "Trial Class",
    ctaViewTrainings: "Log in",

    statsYears: "20+ years",
    statsYearsLabel: "of experience",
    statsStudents: "",
    statsStudentsLabel: "Community in evolution",
    statsMethod: "Structured",
    statsMethodLabel: "methodology",
    statsModalities: "Muay Thai, Boxing, Kickboxing and more",

    aboutTitle: "About Kingdom Fight",
    missionTitle: "Mission",
    missionText: "To train champions inside and outside the ring, transforming lives through the discipline of martial arts. We integrate technology and elite technical training to create fighters and high-performance citizens.",
    visionTitle: "Vision",
    visionText: "To become the largest global network of integrated martial arts education, expanding the Kingdom methodology from Portugal to Europe and the Americas.",
    purposeTitle: "Purpose",
    purposeText: "To forge complete warriors — body, mind and spirit. Guided by integrity, honour and values that transcend the mat.",

    howTitle: "How It Works",
    step1: "Choose your plan",
    step1Desc: "Online, in-person or combo — whatever suits you best.",
    step2: "Access the platform",
    step2Desc: "Calendar, digital check-in and evolution tracking.",
    step3: "Follow the workouts",
    step3Desc: "Structured classes by level and modality.",
    step4: "Evolve constantly",
    step4Desc: "Metrics, coach feedback and visible progress.",

    scheduleTitle: "Class schedule",
    scheduleSubtitle:
      "Weekly timetable at our schools. Updated automatically whenever we change the calendar.",
    scheduleEmptyDay: "No classes",
    scheduleCta: "Book a trial class",
    scheduleFootnote:
      "Reference times (weekly classes). One-off changes or cancellations may vary — please confirm with us.",
    scheduleNoClasses: "We will publish schedules soon. Get in touch or book a trial class.",

    learningPathsTitle: "Learning paths",
    learningPathsSubtitle: "From Beginner to Elite",
    learningPathsDesc: "Technique, mindset and performance — a library of courses to evolve at your own pace. Can't make it to in-person classes? The digital plan gives you access to all online paths.",
    learningPathsCta: "View plans",

    plansTitle: "Plans",
    planOnline: "Kingdom Básico",
    planOnlinePrice: "€20",
    planOnlinePer: "/month",
    planOnlineDesc: "Digital library (courses and content). No check-in or in-gym tracking.",
    planOnlineAudience: "Online study only; does not include classes at the gym.",
    planPresencial1: "Kingdom Presencial I",
    planPresencial1Price: "€55",
    planPresencial1Desc: "Platform (check-in, performance); no digital library (optional +20€ add-on). One class/day, one modality.",
    planPresencial1Audience: "Muay Thai, Boxing or Kickboxing.",
    planPresencial2: "Kingdom Presencial MMA",
    planPresencial2Price: "€80",
    planPresencial2Desc: "All modalities + digital platform. Unlimited check-ins per day.",
    planPresencial2Audience: "Multi-modalities + online study.",
    planFull: "Kingdom FULL",
    planFullPrice: "€100",
    planFullDesc: "Unlimited access + digital + exclusive gifts and benefits.",
    planFullAudience: "Complete experience.",
    popular: "Most Popular",
    planCta: "Start",

    youtubeShortsTitle: "KFS in action",
    youtubeShortsSubtitle: "Some moments from our day on the mat.",

    symbolismTitle: "What the symbol means",
    symbolismSubtitle:
      "Explore each part of our logo — hover, focus with the keyboard, or tap to read the meaning.",
    symbolismHint: "Pick an element on the left or right (or on the logo) to see the explanation.",
    symbolismLogoAlt: "Kingdom Fight School emblem with octagon, crown and fighter — interactive areas",
    symbolismOctagonTitle: "The octagon",
    symbolismOctagonBody:
      "It represents the arena of reality: the place of trial, protection and focus where the warrior is forged.",
    symbolismFighterTitle: "The fighter",
    symbolismFighterBody:
      "The fighter with a raised fist means victory — and also technical growth, discipline and self-development.",
    symbolismColorsTitle: "Chromatic colours",
    symbolismColorsBody:
      "Silver and red convey solidity, discipline, resilience and durability, with a modern, sophisticated feel — body and mind forged in training like metal.",
    symbolismCrownTitle: "The crown",
    symbolismCrownBody:
      "It stands for sovereignty and nobility, and the champion mindset — the «Kingdom» in Kingdom Fight.",
    symbolismBloodTitle: "Blood red",
    symbolismBloodBody:
      "On the crown tips and in the word «Kingdom», it represents energy, passion and controlled aggression — vitality for combat.",
    symbolismProphecyTitle: "Prophecy",
    symbolismProphecyBody:
      "«When they look, even if they do not understand, they will receive in spirit the prophecy that it is by the Lamb’s blood that we can reign with the Lord — and in Him we are more than conquerors.»",

    whyTitle: "Why Kingdom Fight",
    why1: "Experienced trainers",
    why1Desc: "Certified masters, years on the mat.",
    why2: "Structured method",
    why2Desc: "Clear paths from beginner to advanced.",
    why4: "Strong community",
    why4Desc: "Belonging and respect for the temple.",
    why5: "Real evolution",
    why5Desc: "Metrics and tracking of your progress.",

    testimonialsTitle: "What our students say",
    testimonial1: "Kingdom transformed how I train. Discipline and purpose in every class.",
    testimonial1Name: "KFS Student",
    testimonial2: "Clear methodology, visible evolution. I recommend to everyone.",
    testimonial2Name: "KFS Student",
    testimonial3: "More than a gym — a school of life.",
    testimonial3Name: "KFS Student",

    ctaHeadline: "Your transformation starts now.",
    ctaSub: "Take the first step. Free trial class.",
    ctaButton: "Start Now",

    pwaBandTitle: "Platform on your phone",
    pwaBandSub:
      "Add a shortcut to your home screen — open like an app with the same login. No Google Play or App Store required.",

    youtubeUrl: "https://www.youtube.com/@Kingdom_Fight",
    instagramUrl: "https://www.instagram.com/kingdomfightschool",

    foundersTitle: "The Founders",
    foundersSubtitle: "Meet the people who created Kingdom Fight",
    foundersVideoTitle: "The KFS story",
    foundersVideoUrl: "https://www.youtube.com/embed/eQWUG9Q61c4?start=3",
    founder1Name: "Oséias Beu",
    founder1Role: "Co-founder",
    founder1Image: "/founders/Oseias.png",
    founder1Bio: "Started martial arts young, training in Jiu-Jitsu, Boxing and Kickboxing before finding his main passion in Muay Thai, where he earned the Black Prajied under master Márcio Farah at Crokodilos gym in São Paulo. He is an athlete and coach in Boxing and Muay Thai. Beyond combat sports, he works as a data scientist and is currently an MSc student in Data Science at NOVA IMS.",
    founder2Name: "Ícaro Bueno",
    founder2Role: "Co-founder",
    founder2Image: "/founders/Icaro.png",
    founder2Bio: "Started his martial arts journey with Capoeira and Boxing, then began teaching children in a social project where he discovered his vocation for teaching. He became a Muay Thai instructor and found his greatest fulfilment in developing athletes, working the corner and passing on principles and values through sport. With over 20 years of experience, he received the Black Prajied in Muay Thai and has developed many athletes who have competed at different levels.",

    footerLinks: "Quick links",
    footerAulaExp: "Trial Class",
    footerTimer: "Round timer",
    footerJudging: "Arbitration",
    footerSignIn: "Sign in",
    footerSignUp: "Create account",
    footerTerms: "Terms",
    footerPrivacy: "Privacy",
    footerContact: "Contact",
    footerRights: "© Kingdom Fight School. All rights reserved.",

    arbitrationTitle: "Arbitration at Kingdom",
    arbitrationSubtitle: "From training to event day",
    arbitrationDesc:
      "10-Point Must scoring for boxing and Muay Thai — criteria per round, automatic score suggestions and per-athlete incidents. Free on your phone, no sign-up. On the school platform: multiple judges, fight history and custom criteria profiles per event.",
    arbitrationFeature1: "Free, no account",
    arbitrationFeature1Desc: "Use in training, sparring or informal events — like the round timer.",
    arbitrationFeature2: "Criteria per round",
    arbitrationFeature2Desc: "1–5 per corner, official 10-9 scorecard and incident tracking.",
    arbitrationFeature3: "Full events on platform",
    arbitrationFeature3Desc: "Multiple judges, official results, history and tailored criteria sets.",
    arbitrationCtaFree: "Try arbitration",
    arbitrationCtaPlatform: "Sign in to platform",
  },
} as const;

export function getHomeContent(locale: HomeLocale) {
  return homeContent[locale] ?? homeContent.pt;
}

/** Conteúdo da homepage para um locale (PT ou EN) — mesmas chaves em ambos. */
export type HomeContent = (typeof homeContent)[HomeLocale];
