/**
 * Árvore de comandos do assistente do admin (sem LLM).
 * Cada nó ou é um submenu (tem `children`) ou uma ação final (tem `action`).
 * `aliases` alimenta o matcher em lib/admin-chat/match.ts — quanto mais variações
 * de como um admin real diria isso, melhor o reconhecimento.
 */

export type AdminChatAction =
  | { kind: "navigate"; href: string }
  | { kind: "navigate-with-student"; hrefTemplate: string; studentPrompt: string }
  | { kind: "guided"; flow: "cadastro-presencial" }
  | { kind: "avaliar-performance" }
  | { kind: "matricula" };

export type AdminChatNode = {
  id: string;
  label: string;
  aliases: string[];
  hint?: string;
  children?: AdminChatNode[];
  action?: AdminChatAction;
};

export const ADMIN_CHAT_TREE: AdminChatNode[] = [
  {
    id: "cadastro",
    label: "Cadastro",
    aliases: ["cadastro", "cadastrar", "registar", "registo", "criar conta", "novo cadastro"],
    hint: "Alunos, professores, planos e mais",
    children: [
      {
        id: "cadastro-alunos",
        label: "Alunos",
        aliases: ["aluno", "alunos", "estudante", "estudantes"],
        hint: "Convite por email ou cadastro presencial",
        children: [
          {
            id: "cadastro-alunos-convite",
            label: "Enviar convite por email",
            aliases: ["convite", "enviar convite", "convite por email", "convidar aluno"],
            hint: "O aluno recebe email para definir a senha",
            action: { kind: "navigate", href: "/admin/alunos/novo" },
          },
          {
            id: "cadastro-alunos-presencial",
            label: "Cadastro presencial",
            aliases: [
              "presencial",
              "cadastro presencial",
              "cadastrar presencial",
              "cadastro na secretaria",
              "sem email",
              "menor de idade",
              "cadastrar menor",
              "cadastrar crianca",
            ],
            hint: "Secretaria cria a conta com senha inicial (adulto ou menor)",
            action: { kind: "guided", flow: "cadastro-presencial" },
          },
        ],
      },
      {
        id: "cadastro-planos-adesao",
        label: "Planos e adesão",
        aliases: ["plano", "planos", "adesao", "planos e adesao", "criar plano", "novo plano"],
        hint: "Criar ou editar planos do catálogo",
        action: { kind: "navigate", href: "/admin/planos" },
      },
      {
        id: "cadastro-plano-familiar",
        label: "Plano familiar",
        aliases: ["plano familiar", "familia", "grupo familiar", "plano de familia"],
        hint: "Criar grupo familiar, adicionar/remover membros",
        action: { kind: "navigate", href: "/admin/familias/novo" },
      },
      {
        id: "cadastro-seguro",
        label: "Seguro",
        aliases: ["seguro", "seguro do aluno", "apolice", "cobertura"],
        hint: "Renovar, marcar sem cobertura ou registar pagamento (por aluno)",
        action: {
          kind: "navigate-with-student",
          hrefTemplate: "/admin/alunos/{studentId}#seguro",
          studentPrompt: "De qual aluno é o seguro?",
        },
      },
      {
        id: "cadastro-matricula",
        label: "Matrícula",
        aliases: ["matricula", "taxa de matricula", "inscricao"],
        hint: "Valor global ou lançar pagamento de matrícula de um aluno",
        action: { kind: "matricula" },
      },
      {
        id: "cadastro-professores",
        label: "Professores",
        aliases: ["professor", "professores", "coach", "coaches", "treinador", "treinadores"],
        hint: "Criar novo coach",
        action: { kind: "navigate", href: "/admin/coaches/novo" },
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    aliases: ["financeiro", "financas", "pagamento", "pagamentos", "dinheiro", "caixa"],
    hint: "Pagamentos, despesas, relatórios e mais",
    children: [
      {
        id: "financeiro-registar-pagamento",
        label: "Registar pagamento",
        aliases: ["registar pagamento", "lancar pagamento", "novo pagamento", "receber pagamento"],
        action: {
          kind: "navigate-with-student",
          hrefTemplate: "/admin/financeiro/novo?studentId={studentId}",
          studentPrompt: "Para qual aluno é o pagamento?",
        },
      },
      {
        id: "financeiro-editar-pagamento",
        label: "Editar ou apagar pagamento",
        aliases: ["editar pagamento", "apagar pagamento", "remover pagamento", "corrigir pagamento"],
        action: { kind: "navigate", href: "/admin/financeiro" },
      },
      {
        id: "financeiro-gerar-mensalidades",
        label: "Gerar mensalidades do mês",
        aliases: ["gerar mensalidades", "mensalidades do mes", "gerar cobrancas"],
        action: { kind: "navigate", href: "/admin/financeiro" },
      },
      {
        id: "financeiro-primeiro-pagamento",
        label: "Primeiro pagamento",
        aliases: ["primeiro pagamento", "pagamento inicial", "matricula do aluno", "adesao do aluno"],
        hint: "Mensalidade + matrícula opcional + seguro opcional",
        action: {
          kind: "navigate-with-student",
          hrefTemplate: "/admin/financeiro/primeiro-pagamento?studentId={studentId}",
          studentPrompt: "Primeiro pagamento de qual aluno?",
        },
      },
      {
        id: "financeiro-pagamento-antecipado",
        label: "Pagamento antecipado",
        aliases: ["pagamento antecipado", "adiantar mensalidades", "pagar varios meses"],
        action: {
          kind: "navigate-with-student",
          hrefTemplate: "/admin/financeiro/antecipado?studentId={studentId}",
          studentPrompt: "Pagamento antecipado de qual aluno?",
        },
      },
      {
        id: "financeiro-despesa",
        label: "Despesa",
        aliases: ["despesa", "despesas", "gasto", "custo", "nova despesa"],
        action: { kind: "navigate", href: "/admin/financeiro" },
      },
      {
        id: "financeiro-receita-manual",
        label: "Receita manual",
        aliases: ["receita manual", "receita", "lancar receita"],
        action: { kind: "navigate", href: "/admin/financeiro" },
      },
      {
        id: "financeiro-deposito",
        label: "Depósito de espécie",
        aliases: ["deposito", "deposito de especie", "deposito bancario"],
        action: { kind: "navigate", href: "/admin/financeiro" },
      },
      {
        id: "financeiro-relatorio",
        label: "Relatório consolidado",
        aliases: ["relatorio", "relatorio financeiro", "resumo financeiro", "relatorio mensal"],
        action: { kind: "navigate", href: "/admin/financeiro/relatorio" },
      },
      {
        id: "financeiro-compras",
        label: "Compras e inscrições",
        aliases: ["compras", "inscricoes", "compras e inscricoes", "cursos comprados", "eventos inscritos"],
        action: { kind: "navigate", href: "/admin/financeiro/compras" },
      },
      {
        id: "financeiro-pagamentos-coaches",
        label: "Pagamentos a coaches",
        aliases: ["pagamentos a coaches", "pagar coach", "pagar professores", "comissao coach"],
        action: { kind: "navigate", href: "/admin/financeiro/coaches" },
      },
      {
        id: "financeiro-metas",
        label: "Metas de negócio",
        aliases: ["metas", "meta", "metas de negocio", "objetivo de faturamento"],
        action: { kind: "navigate", href: "/admin/metas" },
      },
    ],
  },
  {
    id: "avaliar-performance",
    label: "Avaliar performance",
    aliases: [
      "avaliar performance",
      "avaliar",
      "avaliacao",
      "performance",
      "avaliar aluno",
      "avaliar desempenho",
    ],
    hint: "Diz o nome do aluno para abrir a avaliação",
    action: { kind: "avaliar-performance" },
  },
];

export function flattenAdminChatTree(
  nodes: AdminChatNode[] = ADMIN_CHAT_TREE,
  path: AdminChatNode[] = []
): { node: AdminChatNode; path: AdminChatNode[] }[] {
  const out: { node: AdminChatNode; path: AdminChatNode[] }[] = [];
  for (const node of nodes) {
    const currentPath = [...path, node];
    out.push({ node, path: currentPath });
    if (node.children) {
      out.push(...flattenAdminChatTree(node.children, currentPath));
    }
  }
  return out;
}

export function findNodeById(id: string, nodes: AdminChatNode[] = ADMIN_CHAT_TREE): AdminChatNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(id, node.children);
      if (found) return found;
    }
  }
  return null;
}
