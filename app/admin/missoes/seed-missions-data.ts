/**
 * Missões padrão KFS – importadas do DOCS/MISSOES.md.
 * Usado pela action seedMissionsFromDoc().
 *
 * beltIndex = faixa mínima (null = qualquer): 0 Branca, 2 Amarela, 4 Verde, 6 Azul, 10 Preta, 11 Preta/Dourado, 12 Dourado
 * modality: null = Todas, "MUAY_THAI" | "BOXING" | "KICKBOXING"
 */

export type SeedMission = {
  name: string;
  description: string | null;
  modality: string | null;
  beltIndex: number | null;
  xpReward: number;
};

export const SEED_MISSIONS: SeedMission[] = [
  // ---- Tabela inicial (geral) ----
  { name: "5 aulas este mês", description: "Marca presença confirmada em pelo menos 5 aulas no mês corrente.", modality: null, beltIndex: null, xpReward: 50 },
  { name: "10 aulas este mês", description: "Completa 10 presenças confirmadas no mês.", modality: null, beltIndex: null, xpReward: 90 },
  { name: "3 semanas consistentes", description: "Treina pelo menos 1x por semana durante 3 semanas seguidas.", modality: null, beltIndex: null, xpReward: 60 },
  { name: "Semana perfeita", description: "Marca presença em todas as aulas da tua turma durante 1 semana.", modality: null, beltIndex: null, xpReward: 75 },
  { name: "Primeira aula", description: "Completa a tua primeira aula com presença confirmada.", modality: null, beltIndex: 0, xpReward: 40 },
  { name: "Subir Técnico para 7", description: "Alcança nota 7 ou superior na dimensão Técnico.", modality: null, beltIndex: null, xpReward: 75 },
  { name: "Subir Mental para 8", description: "Alcança nota 8 ou superior na dimensão Mental.", modality: null, beltIndex: 4, xpReward: 85 },
  { name: "Melhorar uma dimensão", description: "Aumenta pelo menos 1 ponto numa das 5 dimensões na próxima avaliação.", modality: null, beltIndex: null, xpReward: 70 },
  { name: "Pedir feedback ao coach", description: "Solicita feedback formal ao instrutor e aplica as recomendações.", modality: null, beltIndex: null, xpReward: 40 },
  { name: "IMC Saudável", description: "Mantém o IMC dentro da faixa saudável por 2 meses consecutivos.", modality: null, beltIndex: null, xpReward: 80 },
  { name: "Atualizar avaliação física", description: "Atualiza peso e altura e realiza nova avaliação física.", modality: null, beltIndex: null, xpReward: 35 },
  { name: "Ver tema da semana", description: "Assiste ao vídeo ou estuda o conteúdo do tema da semana antes da aula.", modality: null, beltIndex: null, xpReward: 30 },
  { name: "Completar curso da biblioteca", description: "Finaliza um curso completo disponível na biblioteca KFS.", modality: null, beltIndex: null, xpReward: 70 },
  { name: "Treinar combo oficial", description: "Executa corretamente o combo técnico definido pelo coach no mês.", modality: null, beltIndex: 2, xpReward: 60 },
  { name: "7 dias de disciplina", description: "Treina ou realiza preparação física 7 dias consecutivos.", modality: null, beltIndex: null, xpReward: 65 },
  { name: "Definir e cumprir meta", description: "Define uma meta mensal e cumpre-a até ao final do mês.", modality: null, beltIndex: null, xpReward: 75 },
  { name: "Trazer um amigo", description: "Traz um amigo para uma aula experimental na KFS.", modality: null, beltIndex: null, xpReward: 50 },
  { name: "Espírito de equipa", description: "Ajuda um colega iniciante durante os treinos (confirmado pelo coach).", modality: null, beltIndex: 6, xpReward: 60 },
  { name: "50 joelhadas técnicas", description: "Executa 50 joelhadas técnicas com forma correta durante treino específico.", modality: "MUAY_THAI", beltIndex: 0, xpReward: 45 },
  { name: "Sparring controlado", description: "Participa num sparring técnico mantendo disciplina e controlo.", modality: "MUAY_THAI", beltIndex: 4, xpReward: 85 },
  { name: "100 jabs perfeitos", description: "Executa 100 jabs com técnica correta num treino supervisionado.", modality: "BOXING", beltIndex: 0, xpReward: 50 },
  { name: "Defesa ativa", description: "Demonstra evolução clara na defesa (slip, esquiva, guarda) avaliada pelo coach.", modality: "BOXING", beltIndex: 4, xpReward: 80 },
  { name: "Combo Kick 3 níveis", description: "Executa combo com variação de altura (baixo, médio, alto) corretamente.", modality: "KICKBOXING", beltIndex: 2, xpReward: 60 },
  { name: "Sparring estratégico", description: "Aplica estratégia tática definida antes do round.", modality: "KICKBOXING", beltIndex: 6, xpReward: 85 },
  { name: "Pronto para próxima faixa", description: "Cumpre todos os critérios técnicos e comportamentais para avaliação de graduação.", modality: null, beltIndex: null, xpReward: 100 },
  // ---- Bloco 1: Iniciantes (Branca / Amarela) ----
  { name: "Primeiras 3 aulas", description: "Completa 3 aulas com presença confirmada.", modality: null, beltIndex: 0, xpReward: 40 },
  { name: "Fundamentos da Guarda", description: "Demonstra guarda correta durante toda a aula.", modality: null, beltIndex: 0, xpReward: 35 },
  { name: "100 movimentos básicos", description: "Executa 100 repetições de golpes básicos com técnica correta.", modality: null, beltIndex: 0, xpReward: 45 },
  { name: "Primeira semana completa", description: "Treina 2x na mesma semana.", modality: null, beltIndex: 0, xpReward: 50 },
  { name: "Postura de Guerreiro", description: "Mantém postura correta durante os drills técnicos.", modality: null, beltIndex: 1, xpReward: 40 },
  { name: "Combo Iniciante", description: "Executa corretamente um combo básico ensinado no mês.", modality: null, beltIndex: 2, xpReward: 60 },
  { name: "Primeira avaliação", description: "Realiza tua primeira avaliação oficial do coach.", modality: null, beltIndex: 0, xpReward: 50 },
  { name: "Conhece a KFS", description: "Assiste ao vídeo institucional e ao tema da semana.", modality: null, beltIndex: 0, xpReward: 30 },
  { name: "Disciplina 14 dias", description: "Treina pelo menos 3x em 14 dias.", modality: null, beltIndex: 2, xpReward: 65 },
  { name: "Mentalidade Iniciante Forte", description: "Recebe nota ≥7 em Mental na avaliação.", modality: null, beltIndex: 2, xpReward: 70 },
  // ---- Bloco 2: Foco em avaliação (Radar) ----
  { name: "Técnico 8", description: "Alcança nota 8 em Técnico.", modality: null, beltIndex: null, xpReward: 80 },
  { name: "Tático 8", description: "Alcança nota 8 em Tático.", modality: null, beltIndex: 4, xpReward: 85 },
  { name: "Físico 9", description: "Alcança nota 9 em Físico.", modality: null, beltIndex: 6, xpReward: 95 },
  { name: "Mental 9", description: "Alcança nota 9 em Mental.", modality: null, beltIndex: 6, xpReward: 95 },
  { name: "Teórico 8", description: "Alcança nota 8 em Teórico.", modality: null, beltIndex: 2, xpReward: 75 },
  { name: "Evolução Completa", description: "Sobe pelo menos 1 ponto em 3 dimensões diferentes.", modality: null, beltIndex: null, xpReward: 100 },
  { name: "Radar Equilibrado", description: "Todas as dimensões ≥7.", modality: null, beltIndex: 4, xpReward: 90 },
  { name: "Excelência KFS", description: "Todas as dimensões ≥8.", modality: null, beltIndex: 10, xpReward: 100 },
  { name: "Recuperação Técnica", description: "Recupera uma dimensão abaixo de 6 para ≥7.", modality: null, beltIndex: null, xpReward: 70 },
  { name: "Feedback Aplicado", description: "Recebe feedback e melhora a nota na avaliação seguinte.", modality: null, beltIndex: null, xpReward: 60 },
  // ---- Bloco 3: Hardcore (Preta / Dourado) ----
  { name: "20 aulas no mês", description: "Treina 20x no mesmo mês.", modality: null, beltIndex: 11, xpReward: 100 },
  { name: "Sparring de Elite", description: "Participa em 5 rounds intensos com controle técnico.", modality: null, beltIndex: 10, xpReward: 90 },
  { name: "Liderança no Tatame", description: "Orienta atletas iniciantes durante treino.", modality: null, beltIndex: 11, xpReward: 85 },
  { name: "30 dias de disciplina", description: "Treina 5x por semana durante 4 semanas.", modality: null, beltIndex: 12, xpReward: 100 },
  { name: "Mental Inquebrável", description: "Nota 9 ou 10 em Mental.", modality: null, beltIndex: 11, xpReward: 95 },
  { name: "Performance Máxima", description: "Nota ≥8 em todas as dimensões.", modality: null, beltIndex: 10, xpReward: 100 },
  { name: "Guardião da Cultura", description: "Ajuda na organização ou evento interno da KFS.", modality: null, beltIndex: 12, xpReward: 80 },
  { name: "Mestre Técnico", description: "Demonstra domínio avançado de combinações complexas.", modality: null, beltIndex: 12, xpReward: 100 },
  // ---- Bloco 4: Mensais recorrentes ----
  { name: "8 aulas no mês", description: "Marca 8 presenças confirmadas.", modality: null, beltIndex: null, xpReward: 70 },
  { name: "12 aulas no mês", description: "Marca 12 presenças confirmadas.", modality: null, beltIndex: null, xpReward: 90 },
  { name: "Tema do mês", description: "Completa o estudo do tema mensal na biblioteca.", modality: null, beltIndex: null, xpReward: 40 },
  { name: "Meta mensal cumprida", description: "Define e cumpre objetivo pessoal do mês.", modality: null, beltIndex: null, xpReward: 75 },
  // ---- Bloco 5: Battle Pass (missões por nível) ----
  { name: "5 aulas na temporada", description: "Completa 5 aulas na temporada.", modality: null, beltIndex: null, xpReward: 50 },
  { name: "Primeiro combo oficial", description: "Executa o primeiro combo oficial com forma correta.", modality: null, beltIndex: null, xpReward: 50 },
  { name: "Tema 1 completo", description: "Completa o primeiro tema da biblioteca.", modality: null, beltIndex: null, xpReward: 40 },
  { name: "15 aulas na temporada", description: "Completa 15 aulas na temporada.", modality: null, beltIndex: null, xpReward: 90 },
  { name: "Subir 1 dimensão", description: "Sobe pelo menos 1 ponto numa dimensão do radar.", modality: null, beltIndex: null, xpReward: 80 },
  { name: "Sparring técnico", description: "Participa num sparring técnico com controlo.", modality: null, beltIndex: 4, xpReward: 85 },
  { name: "30 aulas na temporada", description: "Completa 30 aulas na temporada.", modality: null, beltIndex: 6, xpReward: 100 },
  { name: "Radar ≥7 em tudo", description: "Alcança pelo menos 7 em todas as dimensões do radar.", modality: null, beltIndex: 6, xpReward: 100 },
  { name: "Liderar iniciante", description: "Orienta um iniciante num treino (confirmado pelo coach).", modality: null, beltIndex: 10, xpReward: 90 },
  { name: "Performance 360º", description: "Excelência em todas as dimensões (Preta/Dourado).", modality: null, beltIndex: 11, xpReward: 100 },
  { name: "90 dias sem desistir", description: "Mantém assiduidade e compromisso durante 90 dias.", modality: null, beltIndex: null, xpReward: 100 },
  { name: "Guerreiro da Temporada", description: "Destaque da temporada (Dourado).", modality: null, beltIndex: 12, xpReward: 100 },
];
