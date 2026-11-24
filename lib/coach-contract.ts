/**
 * Contrato de prestação de serviços e termo de adesão do professor (fonte: DOCS/MINUTA_Contrato_Professor.md).
 * Funções puras: o servidor gera o texto com os dados da escola e do professor e guarda-o tal e qual
 * em `CoachDocumentSignature.contentSnapshot` ao assinar. Ao mudar o texto, subir COACH_CONTRACT_VERSION.
 */

export const COACH_CONTRACT_VERSION = "2026-11-v1";

export type CoachDocumentType = "CONTRACT" | "ADHESION_TERM";

export type CoachScheduleRow = { weekday: number; startTime: string; endTime: string; modality: string; location: string };

export type CoachContractFields = {
  school: { name: string; legalName: string; nif: string; legalAddress: string; comarca?: string | null };
  directorName: string;
  coach: {
    legalName: string;
    nif: string;
    idDocumentNumber: string | null;
    address: string;
    tptdNumber: string;
  };
  modalities: string[];
  /** YYYY-MM-DD */
  date: string;
  schedule: CoachScheduleRow[];
};

export type ContractSection = { title?: string; paragraphs: string[] };

const WEEKDAYS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function ptDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function scheduleLines(schedule: CoachScheduleRow[]): string[] {
  if (schedule.length === 0) return ["Sem aulas atribuídas à data da assinatura; os horários são acordados com o Diretor Técnico e registados na plataforma."];
  return [...schedule]
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
    .map((r) => `${WEEKDAYS[r.weekday] ?? r.weekday} · ${r.startTime.slice(0, 5)}–${r.endTime.slice(0, 5)} · ${r.modality}${r.location ? ` · ${r.location}` : ""}`);
}

export function renderCoachContract(f: CoachContractFields): ContractSection[] {
  const s = f.school;
  const c = f.coach;
  return [
    { title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TREINO DESPORTIVO", paragraphs: [] },
    {
      paragraphs: [
        `Primeiro outorgante: ${s.legalName}, NIPC ${s.nif}, com sede em ${s.legalAddress}, aqui representada por ${f.directorName}, na qualidade de Diretor Técnico («Escola»).`,
        `Segundo outorgante: ${c.legalName}, NIF ${c.nif}${c.idDocumentNumber ? `, portador do CC n.º ${c.idDocumentNumber}` : ""}, residente em ${c.address}, titular do Título Profissional de Treinador de Desporto n.º ${c.tptdNumber} («Professor»).`,
        "As partes celebram, de boa-fé, o presente contrato de prestação de serviços, que se rege pelas cláusulas seguintes.",
      ],
    },
    {
      title: "Cláusula 1.ª: Objeto",
      paragraphs: [
        `1. O Professor presta à Escola serviços de ensino e treino das modalidades ${list(f.modalities)}, nas instalações de ${s.name}.`,
        "2. O Professor exerce a atividade como trabalhador independente, sem subordinação jurídica. Este contrato não constitui um contrato de trabalho.",
      ],
    },
    {
      title: "Cláusula 2.ª: Horários",
      paragraphs: [
        "1. Os horários das aulas foram discutidos e acordados livremente entre a Escola e o Professor, tendo em conta a disponibilidade de ambos, e constam do Anexo I, que faz parte deste contrato.",
        "2. Os horários só podem ser alterados por acordo entre as partes. O acordo fica registado na plataforma da Escola, e o Anexo I é atualizado em conformidade.",
        "3. Fora dos horários do Anexo I, o Professor não está obrigado a qualquer presença nas instalações da Escola.",
      ],
    },
    {
      title: "Cláusula 3.ª: Autonomia técnica e pedagógica",
      paragraphs: [
        "1. O Professor tem total autonomia na forma de lecionar as aulas, nomeadamente na escolha dos métodos de ensino, da estrutura da aula, dos exercícios, das técnicas e da progressão dos alunos.",
        "2. A Escola não dá ao Professor ordens ou instruções sobre o modo de executar o serviço. Pode apenas transmitir-lhe: a) as regras de segurança e de utilização das instalações; b) os critérios do programa de graduação da Escola, que servem apenas para avaliar os alunos nos exames de graduação.",
        "3. O Professor pode fazer-se substituir por outro treinador habilitado com TPTD válido. A substituição é comunicada ao Diretor Técnico e fica registada na plataforma.",
      ],
    },
    {
      title: "Cláusula 4.ª: Obrigações do Professor",
      paragraphs: [
        "1. Dar as aulas do Anexo I com pontualidade e em condições de segurança.",
        "2. Registar na plataforma da Escola as presenças, avaliações e graduações dos alunos, porque são a base do cálculo da sua remuneração e da graduação dos alunos.",
        "3. Manter válido o Título Profissional de Treinador de Desporto (Lei n.º 40/2012, de 28 de agosto) e informar a Escola de qualquer alteração.",
        "4. Ter seguro de responsabilidade civil e de acidentes pessoais adequado à atividade, ou aderir ao seguro indicado pela Escola.",
        "5. Avisar o Diretor Técnico com pelo menos 48 horas de antecedência de qualquer ausência e, sempre que possível, indicar um substituto nos termos da cláusula 3.ª, n.º 3.",
        "6. Cumprir o Regulamento Interno e o Código de Conduta da Escola (ver o Termo de Adesão).",
      ],
    },
    {
      title: "Cláusula 5.ª: Obrigações da Escola",
      paragraphs: [
        "1. Disponibilizar as instalações, o equipamento comum e o acesso à plataforma.",
        "2. Cobrar as mensalidades aos alunos e pagar ao Professor nos termos das cláusulas 6.ª e 7.ª.",
        "3. Dar ao Professor, na plataforma, acesso permanente ao cálculo detalhado da sua remuneração e à lista dos alunos que contam para esse cálculo.",
      ],
    },
    {
      title: "Cláusula 6.ª: Remuneração e forma de apuramento",
      paragraphs: [
        "1. Definições. a) Mês de apuramento: cada mês civil, do dia 1 ao último dia do mês; b) Preço de tabela: o preço mensal do plano do aluno publicado pela Escola, antes de qualquer desconto; c) Valor-base: o preço de tabela sem IVA, ou seja, o preço de tabela dividido por 1,23 (1 + taxa de IVA de 23%), arredondado ao cêntimo; se a taxa de IVA mudar, aplica-se automaticamente a nova taxa; d) Mensalidade paga: a mensalidade cujo pagamento a Escola recebeu dentro do mês de apuramento, seja qual for o mês a que respeita; e) Modalidades do aluno: as modalidades registadas na plataforma para esse aluno no mês de apuramento; f) Professor da modalidade: cada professor registado na plataforma como lecionando essa modalidade na escola do aluno.",
        "2. Parte do Professor por tipo de plano. Por cada mensalidade paga de um aluno que tenha o Professor como professor de pelo menos uma das suas modalidades, o Professor recebe: a) Plano de uma modalidade: 40% do valor-base; b) Plano de duas modalidades: 35% do valor-base por cada modalidade do aluno que o Professor leciona, ou seja, 70% se lecionar as duas; c) Plano de todas as modalidades: 80% do valor-base, divididos em partes iguais por todos os professores da escola que, no mês de apuramento, lecionem modalidades incluídas nesse plano, independentemente das modalidades que o aluno treine; cada professor conta uma só vez, mesmo que lecione várias modalidades; os professores que lecionem apenas modalidades KIDS não entram nesta divisão; a Escola fica com os restantes 20%; d) Plano Kingdom Week: um valor fixo de 10,00 € por mensalidade paga; e) Planos KIDS (Muay Thai KIDS e Jiu-Jitsu KIDS): aplicam-se as regras das alíneas a) e b), sobre o valor-base do respetivo plano KIDS.",
        "3. Vários professores na mesma modalidade. Quando uma modalidade tem mais do que um professor na mesma escola, a parte correspondente a essa modalidade divide-se em partes iguais entre esses professores, salvo outra divisão acordada por escrito.",
        "4. Descontos da Escola. Os descontos concedidos pela Escola, nomeadamente a fidelização, o plano família, os cupões e as promoções, são suportados apenas pela Escola e não reduzem a parte do Professor, que é sempre calculada sobre o valor-base. A soma dos descontos de cada aluno não pode ultrapassar 15% do preço de tabela.",
        "5. Bolsas do Professor. Quando o próprio Professor, com o acordo do Diretor Técnico, atribui a um aluno uma bolsa de 100%, nem o Professor nem a Escola recebem qualquer valor relativo a esse aluno enquanto durar a bolsa.",
        "6. Pausas. Um aluno com a mensalidade suspensa (por exemplo, por atestado médico) não gera remuneração nesse mês.",
        "7. Exclusões. Não contam para a remuneração a matrícula, o seguro, as compras na loja, os cursos online, os eventos e quaisquer outras receitas da Escola.",
        "8. Reembolsos. Se a Escola reembolsar a um aluno uma mensalidade que já contou para a remuneração, a parte correspondente é deduzida no mês de apuramento em que o reembolso é feito.",
        "9. Arredondamentos. Cada parcela é arredondada ao cêntimo e o total do mês é a soma das parcelas.",
        "10. Relatório mensal. O cálculo de cada mês fica disponível na plataforma, aluno a aluno, com o plano, as modalidades, a regra aplicada e o valor. O Anexo II tem exemplos de cálculo.",
        "11. Alterações. As percentagens e os valores desta cláusula só podem ser alterados por acordo escrito entre as partes, com efeitos a partir do mês seguinte ao acordo.",
      ],
    },
    {
      title: "Cláusula 7.ª: Dia e forma de pagamento",
      paragraphs: [
        "1. O apuramento de cada mês fecha no último dia desse mês.",
        "2. Até ao dia 3 do mês seguinte, a Escola disponibiliza na plataforma o relatório final do mês, com o valor a pagar.",
        "3. O Professor pode contestar o relatório, de forma fundamentada e pela plataforma ou por escrito, até ao dia 7. As partes resolvem a contestação de boa-fé. A parte do valor que não for contestada é paga no prazo normal.",
        "4. O Professor emite o recibo eletrónico (recibo verde) ou a fatura no Portal das Finanças pelo valor apurado e carrega-o na plataforma.",
        "5. A Escola paga até ao dia 10 do mês seguinte ao mês de apuramento, ou no dia útil seguinte se o dia 10 não for dia útil, por transferência bancária para o IBAN indicado pelo Professor na plataforma. Se o recibo for emitido depois do dia 8, o prazo passa para 2 dias úteis após a sua receção.",
        "6. A Escola faz as retenções na fonte que a lei lhe imponha. Cabem ao Professor as suas restantes obrigações fiscais e contributivas.",
        "7. O pagamento é registado na plataforma pelo Diretor Técnico da Escola ou pelo Administrador Geral, com a data e o comprovativo de transferência, e fica visível para o Professor.",
        "8. Mensalidades pagas por alunos depois do fecho de um mês contam para o mês de apuramento em que forem recebidas.",
      ],
    },
    {
      title: "Cláusula 8.ª: Proteção de dados (RGPD)",
      paragraphs: [
        "1. O Professor acede a dados pessoais dos alunos (incluindo dados de saúde e de menores) apenas para dar aulas e acompanhar os alunos, atuando nos termos definidos pela Escola enquanto responsável pelo tratamento.",
        "2. O Professor compromete-se a não copiar, exportar ou divulgar esses dados, nem os usar depois de terminado o contrato.",
      ],
    },
    {
      title: "Cláusula 9.ª: Lealdade e não aliciamento",
      paragraphs: [
        "Durante o contrato e nos 12 meses seguintes, o Professor não pode aliciar alunos da Escola para aulas particulares ou para outro ginásio ou escola dentro de um raio de 10 km, salvo autorização escrita da Escola.",
      ],
    },
    {
      title: "Cláusula 10.ª: Imagem e conteúdos",
      paragraphs: [
        "1. O Professor autoriza o uso da sua imagem e nome na comunicação da Escola enquanto durar o contrato.",
        "2. Os conteúdos produzidos para a biblioteca ou cursos da Escola regem-se por acordo próprio de co-criação.",
      ],
    },
    {
      title: "Cláusula 11.ª: Duração e cessação",
      paragraphs: [
        `1. O contrato começa em ${ptDate(f.date)} e é celebrado por tempo indeterminado.`,
        "2. Qualquer das partes pode pôr-lhe fim, sem necessidade de justificação, com um aviso prévio escrito de 30 dias.",
        "3. A Escola pode pôr-lhe fim de imediato em caso de incumprimento grave, nomeadamente: comportamento que ponha em risco a segurança dos alunos, violação de dados pessoais ou perda do TPTD.",
        "4. A remuneração devida até à data da cessação é apurada e paga nos termos das cláusulas 6.ª e 7.ª.",
      ],
    },
    {
      title: "Cláusula 12.ª: Foro",
      paragraphs: [`Para qualquer litígio é competente o foro da comarca de ${s.comarca?.trim() || "Lisboa Oeste"}.`],
    },
    {
      paragraphs: [`Feito e assinado eletronicamente na plataforma da Escola em ${ptDate(f.date)}, ficando cada parte com uma cópia.`],
    },
    { title: "Anexo I: Horários acordados", paragraphs: scheduleLines(f.schedule) },
    {
      title: "Anexo II: Exemplos de cálculo",
      paragraphs: [
        "Valores-base: 55 € → 44,72 € · 65 € → 52,85 € · 80 € → 65,04 € · 100 € → 81,30 €.",
        "Plano de 1 modalidade, 55 €: 44,72 € × 40% = 17,89 € para o Professor.",
        "Plano de 2 modalidades, 80 €, o Professor dá uma das duas: 65,04 € × 35% = 22,76 €; dá as duas: 65,04 € × 70% = 45,53 €.",
        "O mesmo, com fidelização (o aluno paga 70 €): o Professor continua a receber 45,53 €, calculado sobre o valor-base de 80 €.",
        "Plano KIDS de 2 modalidades, 65 €, o Professor dá uma: 52,85 € × 35% = 18,50 €.",
        "Plano de todas as modalidades, 100 €, escola com 4 professores: 81,30 € × 80% ÷ 4 = 16,26 € para cada professor.",
        "Kingdom Week, 25 €: 10,00 € fixos.",
        "Aluno com bolsa de 100% dada pelo Professor: 0,00 €.",
      ],
    },
  ];
}

export function renderCoachAdhesionTerm(f: CoachContractFields): ContractSection[] {
  return [
    { title: "TERMO DE ADESÃO DO PROFESSOR", paragraphs: [] },
    {
      paragraphs: [
        `Eu, ${f.coach.legalName}, NIF ${f.coach.nif}, declaro que:`,
        `1. Li e aceito o Regulamento Interno e o Código de Conduta da ${f.school.name}.`,
        "2. Me comprometo a: tratar todos os alunos com respeito, sem qualquer forma de discriminação ou assédio; nunca ficar sozinho com um aluno menor num espaço fechado, salvo emergência; não treinar nem dar aulas sob o efeito de álcool ou de substâncias proibidas; interromper o treino de qualquer aluno que mostre sinais de lesão ou de mal-estar, e comunicar o incidente na plataforma; usar a farda da Escola nas aulas.",
        "3. Autorizo a Escola a guardar os meus dados pessoais (identificação, NIF, IBAN, TPTD) para gerir o contrato e os pagamentos, nos termos da Política de Privacidade.",
        "4. Declaro que as informações que dei são verdadeiras e comprometo-me a atualizá-las na plataforma.",
        `Assinado eletronicamente em ${ptDate(f.date)}.`,
      ],
    },
  ];
}

/** Texto simples guardado na assinatura (o que o professor viu e assinou). */
export function sectionsToText(sections: ContractSection[]): string {
  return sections
    .map((s) => [s.title, ...s.paragraphs].filter((x): x is string => Boolean(x && x.trim())).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}

// ─── Validação dos dados pessoais do professor ───────────────────────────────────────────────────

/** NIF português: 9 dígitos com dígito de controlo (módulo 11). */
export function isValidPtNif(raw: string): boolean {
  const nif = raw.replace(/\s/g, "");
  if (!/^\d{9}$/.test(nif)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(nif[i]) * (9 - i);
  const check = 11 - (sum % 11);
  return (check >= 10 ? 0 : check) === Number(nif[8]);
}

/** IBAN (qualquer país): formato e controlo módulo 97. */
export function normalizeIban(raw: string): string | null {
  const iban = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1 ? iban : null;
}

export type CoachPrivateDataInput = {
  legalName: string;
  nif: string;
  idDocumentNumber: string | null;
  address: string;
  iban: string;
  tptdNumber: string;
  tptdValidUntil: string | null;
  selfEmployed: boolean;
};

/** Valida o formulário de dados do professor. `todayYmd` = hoje (YYYY-MM-DD), para o TPTD não estar caducado. */
export function validateCoachPrivateData(
  get: (key: string) => unknown,
  todayYmd: string
): { data?: CoachPrivateDataInput; error?: string } {
  const str = (k: string) => (typeof get(k) === "string" ? (get(k) as string).trim() : "");
  const legalName = str("legalName").replace(/\s+/g, " ");
  if (legalName.length < 5 || !legalName.includes(" ")) return { error: "Indica o teu nome completo." };
  const nif = str("nif").replace(/\s/g, "");
  if (!isValidPtNif(nif)) return { error: "NIF inválido." };
  const idDocumentNumber = str("idDocumentNumber") || null;
  const address = str("address");
  if (address.length < 8) return { error: "Indica a tua morada completa." };
  const iban = normalizeIban(str("iban"));
  if (!iban) return { error: "IBAN inválido." };
  const tptdNumber = str("tptdNumber");
  if (tptdNumber.length < 3) return { error: "Indica o número do teu TPTD (título de treinador)." };
  const tptdValidUntil = str("tptdValidUntil") || null;
  if (tptdValidUntil && !/^\d{4}-\d{2}-\d{2}$/.test(tptdValidUntil)) return { error: "Data de validade do TPTD inválida." };
  if (tptdValidUntil && tptdValidUntil < todayYmd) return { error: "O teu TPTD está caducado." };
  const selfEmployed = get("selfEmployed") === "on" || get("selfEmployed") === "true";
  if (!selfEmployed) return { error: "Precisas de ter atividade aberta nas Finanças para passar recibos." };
  return { data: { legalName, nif, idDocumentNumber, address, iban, tptdNumber, tptdValidUntil, selfEmployed } };
}

/** Escolas onde ainda falta assinar algum documento da versão atual. */
export function schoolsMissingSignature(
  schoolIds: string[],
  signed: { schoolId: string; documentType: string; documentVersion: string }[],
  version = COACH_CONTRACT_VERSION
): string[] {
  const has = new Set(signed.filter((s) => s.documentVersion === version).map((s) => `${s.schoolId}|${s.documentType}`));
  return schoolIds.filter((id) => !has.has(`${id}|CONTRACT`) || !has.has(`${id}|ADHESION_TERM`));
}
