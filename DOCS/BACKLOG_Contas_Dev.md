# Backlog — Contas de DEV que não aparecem em produção

Estado em **18 nov. 2026**: resolvido com a **Escola Demo** (`demo-school`, ver `lib/demo.ts`). Contas de teste devem ter o `Student` na Escola Demo (`node scripts/demo/seed-escola-demo.mjs` tem `--mover-testers`); o Admin Geral em «Todas» não a conta. O tester oficial não tem `Student`, por isso já não aparece nas listas.

## Objetivo
Ter contas de teste ("testers") para o ambiente de DEV/Preview que **nunca aparecem em PRD** (listas, rankings, relatórios, financeiro, encomendas).

## Contexto
- Conta de teste oficial designada: `beuoseias+teste@gmail.com` (a palavra-passe fica só com o utilizador, nunca no repositório).
- O Preview da Vercel provavelmente usa o **mesmo Supabase da produção** (`bkkhwf…`), por isso uma conta criada em DEV existe também em PRD e é preciso escondê-la em produção.
- Usada para testar o pagamento online da loja (Revolut Merchant, Sandbox). Ver `BACKLOG_Pagamentos_Revolut.md`.

## A decidir
1. Confirmar se o Preview usa o Supabase de produção ou se vale a pena um **projeto Supabase separado para DEV** (resolve o problema pela raiz, com custo de manter dois ambientes).
2. Se for o mesmo Supabase: como marcar as contas de teste — regra por email (`+teste`, `@local.test`), lista de emails, ou coluna `isTester` em `User` (migração, a confirmar com o utilizador).

## Proposta se o Supabase for partilhado
- Em produção (`VERCEL_ENV=production`) excluir contas de teste de: alunos, ranking, relatórios, Financeiro, encomendas da loja e dashboards do admin.
- Em Preview e local continuam visíveis.
- Palavra-passe forte nas contas de teste (uma conta com palavra-passe trivial numa base de produção é um risco).
- Limpeza de dados de teste (encomendas, vendas) depois de cada teste.
