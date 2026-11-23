/**
 * Loja (física/pré-encomendas) ligada ou desligada em toda a rede — decisão de 2026-11-23: oculta por agora.
 * Desligada: some dos menus (admin, aluno, site), o catálogo /loja e /dashboard/loja dão 404 e não se criam
 * encomendas novas. As encomendas já feitas continuam visíveis (detalhe da encomenda, «A tratar», e
 * /admin/loja/encomendas por link direto) até serem entregues. A Academy (cursos) não depende disto.
 * Para voltar a abrir: true.
 */
export const STORE_ENABLED = false;

export const STORE_CLOSED_MESSAGE = "A loja está fechada de momento.";
