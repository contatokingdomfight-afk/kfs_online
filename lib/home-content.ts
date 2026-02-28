/**
 * Conteúdo da Homepage — centralizado para i18n
 * Usar getHomeContent(locale) para obter textos.
 */

export type HomeLocale = "pt" | "en";

export const homeContent = {
  pt: {
    // Header
    headerCta: "Aula Experimental",

    // Hero
    heroHeadline: "Treine com Propósito. Lute com Disciplina.",
    heroSubheadline: "Transforme o seu corpo e mente através das artes marciais. Metodologia Kingdom — onde cada golpe tem significado.",
    ctaStart: "Começar Agora",
    ctaViewTrainings: "Ver Treinos",

    // Stats
    statsYears: "+10 anos",
    statsYearsLabel: "de experiência",
    statsStudents: "+500",
    statsStudentsLabel: "alunos formados",
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

    // Plans
    plansTitle: "Planos",
    planOnline: "Kingdom Online",
    planOnlinePrice: "€20",
    planOnlinePer: "/mês",
    planOnlineDesc: "Plataforma digital: cursos, biblioteca e treino remoto.",
    planOnlineAudience: "Ideal para quem treina à distância.",
    planPresencial1: "Kingdom Presencial I",
    planPresencial1Price: "€40",
    planPresencial1Desc: "Uma modalidade à escolha. Foco total.",
    planPresencial1Audience: "Muay Thai, Boxe ou Kickboxing.",
    planPresencial2: "Kingdom Presencial MMA",
    planPresencial2Price: "€80",
    planPresencial2Desc: "Todas as modalidades + plataforma digital.",
    planPresencial2Audience: "Multi-modalidades + estudo online.",
    planFull: "Kingdom FULL",
    planFullPrice: "€100",
    planFullDesc: "Acesso ilimitado + digital + benefícios exclusivos.",
    planFullAudience: "Experiência completa.",
    popular: "Mais Popular",
    planCta: "Começar",

    // Why choose
    whyTitle: "Por que a Kingdom Fight",
    why1: "Treinadores experientes",
    why1Desc: "Mestres certificados, anos de tatame.",
    why2: "Método estruturado",
    why2Desc: "Trilhas claras do iniciante ao avançado.",
    why3: "Valores cristãos",
    why3Desc: "Integridade, honra e formação de carácter.",
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

    // Footer
    footerLinks: "Links rápidos",
    footerAulaExp: "Aula Experimental",
    footerSignIn: "Entrar",
    footerSignUp: "Criar conta",
    footerContact: "Contacto",
    footerRights: "© Kingdom Fight School. Todos os direitos reservados.",
  },
  en: {
    headerCta: "Trial Class",

    heroHeadline: "Train with Purpose. Fight with Discipline.",
    heroSubheadline: "Transform your body and mind through martial arts. Kingdom methodology — where every strike has meaning.",
    ctaStart: "Start Now",
    ctaViewTrainings: "View Trainings",

    statsYears: "+10 years",
    statsYearsLabel: "of experience",
    statsStudents: "+500",
    statsStudentsLabel: "students trained",
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

    plansTitle: "Plans",
    planOnline: "Kingdom Online",
    planOnlinePrice: "€20",
    planOnlinePer: "/month",
    planOnlineDesc: "Digital platform: courses, library and remote training.",
    planOnlineAudience: "Ideal for remote training.",
    planPresencial1: "Kingdom Presencial I",
    planPresencial1Price: "€40",
    planPresencial1Desc: "One modality of your choice. Total focus.",
    planPresencial1Audience: "Muay Thai, Boxing or Kickboxing.",
    planPresencial2: "Kingdom Presencial MMA",
    planPresencial2Price: "€80",
    planPresencial2Desc: "All modalities + digital platform.",
    planPresencial2Audience: "Multi-modalities + online study.",
    planFull: "Kingdom FULL",
    planFullPrice: "€100",
    planFullDesc: "Unlimited access + digital + exclusive benefits.",
    planFullAudience: "Complete experience.",
    popular: "Most Popular",
    planCta: "Start",

    whyTitle: "Why Kingdom Fight",
    why1: "Experienced trainers",
    why1Desc: "Certified masters, years on the mat.",
    why2: "Structured method",
    why2Desc: "Clear paths from beginner to advanced.",
    why3: "Christian values",
    why3Desc: "Integrity, honour and character formation.",
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

    footerLinks: "Quick links",
    footerAulaExp: "Trial Class",
    footerSignIn: "Sign in",
    footerSignUp: "Create account",
    footerContact: "Contact",
    footerRights: "© Kingdom Fight School. All rights reserved.",
  },
} as const;

export function getHomeContent(locale: HomeLocale) {
  return homeContent[locale] ?? homeContent.pt;
}
