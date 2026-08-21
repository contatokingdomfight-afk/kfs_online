# Teste de regressão em produção (kingdomfight.com)

> Checklist reutilizável da varredura manual de **julho 2026** em `https://kingdomfight.com`.  
> Complementa [`CONTAS_TESTE.md`](CONTAS_TESTE.md) e [`GUIA_TESTE_VALIDACAO_PERFIS.md`](GUIA_TESTE_VALIDACAO_PERFIS.md) (fluxos por perfil em staging/local).

**Última execução documentada:** 2026-07-09 (pós-deploy commit `e6c40fc`).

---

## 1. Regras obrigatórias

| Regra | Detalhe |
|-------|---------|
| Ambiente | Produção: `https://kingdomfight.com` |
| Password contas teste | `KfsTeste2026!` (ou `TEST_SEED_PASSWORD` no seed) |
| **Não tocar** | `boretok913@epaynine.com`, `kewes96529@epaynine.com` (experimentais reais) |
| Cookies | Aceitar banner antes de interagir |
| Dados de teste | **Apagar após regressão** — ver secção 3 e `scripts/sql/cleanup-regression-test-data.sql` |
| Branch de código | Desenvolvimento em `dev`; produção via `main` |

---

## 2. Contas e IDs de referência

Ver [`CONTAS_TESTE.md`](CONTAS_TESTE.md). Resumo usado na regressão:

| Email | Perfil | Notas |
|-------|--------|-------|
| `kfs.test.admin@local.test` | ADMIN | Sessão principal admin |
| `kfs.test.coach@local.test` | COACH | Sem turmas atribuídas (estados vazios esperados) |
| `kfs.test.aluno@local.test` | ALUNO | Membro plano família; check-in Muay Thai |
| `demo@teste.com` | ALUNO | Titular família; plano Kingdom Família |
| `kfs.test.experimental@local.test` | ALUNO | Convertido de experimental |

**IDs úteis (jul/2026):**

| Recurso | ID |
|---------|-----|
| Aula Muay Thai (qua 18–20h) | `307671a9-6fb4-43f4-8685-f194633b08b1` |
| Evento Workshop | `5cbf6088-4789-4f6d-9955-ca0de6dab520` |
| Grupo família | `af38a044-e7f1-455d-aff3-984757fb23ad` |
| Curso biblioteca | `383193e8-2abd-49ea-923c-07dc04f2823b` |

---

## 3. Dados de teste criados na regressão (apagar depois)

> **Limpeza em produção:** 2026-07-09 — executado via Supabase; receita jul/2026 voltou a refletir só alunos reais (~100 €: Gustavo 55+45). Script: [`scripts/sql/cleanup-regression-test-data.sql`](../scripts/sql/cleanup-regression-test-data.sql).

| Tipo | Referência (jul/2026) |
|------|------------------------|
| Pagamento demo set/2026 | 80€ espécie — removido |
| Attendance demo | `713219a3-9bfa-4262-b6eb-20685e654e41` — removido |
| Pagamento antecipado demo ago/2026 | `81d9487d-10f4-47ed-a818-c565eff293b9` — removido |
| Trial convertido | `a1b2c3d4-test-exp-0001-000000000001` (mantém registo; aluno teste sem pagamentos) |
| Venda loja | `78673cbd-95f7-4a83-b799-41bade282b1b` (25€) — removido |
| Inscrição evento demo | Workshop — removido |
| Primeiro pagamento experimental | bundle 120€ jul/2026 — removido |
| RPE / presenças jul/08 | removidos |
| Progresso biblioteca demo | 1 unidade — removido |

**Mantido de propósito:** `demo@teste.com` com matrícula/seguro **LATE** (cenário «pendentes» na secção 7).

---

## 4. Inventário de rotas (smoke)

Objetivo por rota: **sem HTTP 500**, **sem redirect indevido para `/sign-in`**, **sem página de erro da app**.

### 4.1 Admin (`kfs.test.admin@local.test`)

| Rota | Smoke |
|------|-------|
| `/admin` | KPIs, gráficos, ações imediatas |
| `/admin/alunos`, `/admin/alunos?newThisMonth=1` | Lista e filtros |
| `/admin/alunos/[id]` | Detalhe (ex. demo, kfs.test.aluno) |
| `/admin/atletas`, `/admin/coaches`, `/admin/leads` | Listagens |
| `/admin/experimentais` | Lista; **não** converter Boreto/Kewe |
| `/admin/familias`, `/admin/familias/[id]` | Grupos família |
| `/admin/turmas` | Grade semanal com aulas recorrentes |
| `/admin/presenca` | Ver secção 5.1 |
| `/admin/presenca` + turmas | Coerência de aulas |
| `/admin/financeiro` e sub-rotas | visão geral, novo, antecipado, compras, coaches, primeiro-pagamento, relatório |
| `/admin/loja`, produtos, stock, vendas | Hub loja |
| `/admin/eventos`, `/admin/eventos/[id]`, validar | Eventos |
| `/admin/cursos`, `/admin/cursos/[id]` | Biblioteca admin |
| `/admin/missoes`, `/admin/permissoes`, `/admin/configuracoes` | Plataforma |
| `/admin/avaliacao`, `/admin/componentes-gerais`, `/admin/desempenho-modalidades` | Avaliação |
| `/admin/escolas`, `/admin/locais`, `/admin/planos`, `/admin/modalidades` | Académico |
| `/admin/notificacoes` | Central notificações |

### 4.2 Coach (`kfs.test.coach@local.test`)

| Rota | Smoke / nota |
|------|----------------|
| `/coach` | Home; atletas vazios OK |
| `/coach/presenca`, `/coach/agenda`, `/coach/aula`, `/coach/aula/qr` | Agenda |
| `/coach/alunos`, `/coach/alunos/[id]` (+ performance, inscrição, avaliações) | Alunos |
| `/coach/eventos`, `/coach/eventos/[id]/validar` | Eventos |
| `/coach/biblioteca`, `/coach/cursos` | Conteúdo |
| `/coach/experimentais` | Boreto/Kewe visíveis |
| `/coach/financeiro`, `/coach/desempenho-modalidades` | Vazios OK (sem turmas) |
| `/coach/configuracoes`, `/coach/notificacoes`, `/coach/round-timer` | Utilitários |

### 4.3 Aluno (`demo@teste.com` e `kfs.test.aluno@local.test`)

| Rota | Conta sugerida |
|------|----------------|
| `/dashboard` | Ambas (banner família só membro) |
| `/dashboard/financeiro`, `/dashboard/historico` | Ambas |
| `/dashboard/bem-estar` (+ rpe, peso, dores, benchmarks) | demo |
| `/dashboard/performance`, `/dashboard/performance/historico` | demo |
| `/dashboard/biblioteca`, `/dashboard/biblioteca/[id]` | demo |
| `/dashboard/eventos`, `/dashboard/conquistas`, `/dashboard/rank` | demo / kfs.test.aluno |
| `/dashboard/tribo`, `/dashboard/perfil`, `/dashboard/ficha-fisica` | demo |
| `/dashboard/notificacoes`, `/dashboard/beneficios`, `/dashboard/loja` | demo |
| `/check-in/[lessonId]?date=YYYY-MM-DD` | kfs.test.aluno |

### 4.4 Público (sem login)

| Rota |
|------|
| `/`, `/aula-experimental`, `/sign-in`, `/escolher-plano` |
| `/termos`, `/privacidade`, `/como-sou-avaliado`, `/timer`, `/lista_espera` |

---

## 5. Checkpoints de regressão (pós-fix jul/2026)

Estes 5 pontos validam o commit `e6c40fc` (+ fix titular família se aplicável).

### 5.1 `/admin/presenca` — aulas nos próximos 14 dias

1. Login admin → `/admin/presenca`
2. **Esperado:** lista de aulas (Boxing, Muay Thai, …) com datas e link `Ver/confirmar →` com `?date=`
3. **Falha típica:** «Nenhuma aula nos próximos 14 dias» com turmas visíveis em `/admin/turmas`

### 5.2 KPI receita home = financeiro

1. `/admin` → cartão «Receita este mês»
2. `/admin/financeiro` → «Receita (mês)» (julho de 2026)
3. **Esperado:** mesmo valor (ex. **470 €** em jul/2026)
4. **Falha típica:** home 245 € vs financeiro 470 €

### 5.3 Gráfico receita — eixo sem `/null`

1. `/admin` → gráfico «Receita mensal (12 meses)»
2. **Esperado:** labels `MM/AAAA` válidos (ex. `07/2026`)
3. **Falha típica:** label `/null` no eixo X

### 5.4 KPIs de presença na home admin

1. `/admin` → «Média presenças (diária)» — deve ser **> 0** se houve check-ins na janela
2. Gráfico «Popularidade modalidades (30 dias)» — deve mostrar fatias (ex. Muay Thai), não só «Sem dados»
3. Cruzar com presença confirmada de `kfs.test.aluno`

### 5.5 Banner família — nome do titular

1. Login `kfs.test.aluno@local.test` → `/dashboard`
2. **Esperado:** «És membro do plano família de **demo**» (titular `demo@teste.com`)
3. **Falha típica:** «…de **—**»
4. **Causa:** RLS em `Student` + `User` do titular; fix em `lib/family-group.ts` (service role para ambos)

---

## 6. Registo da validação 2026-07-09

| # | Checkpoint | Resultado | Evidência |
|---|------------|-----------|-----------|
| 1 | Presença admin | **OK** | Lista Boxing/Muay Thai 09/07–23/07; links com `date=` |
| 2 | Receita 470 € | **OK** | Home e `/admin/financeiro` ambos 470,00 € (jul/2026) |
| 3 | Gráfico sem `/null` | **OK** | Eixo: 09/2025 … 07/2026 |
| 4 | Presença KPIs | **OK** | Média 0,1; donut Muay Thai |
| 5 | Banner titular | **OK** (2.º deploy `8b00f55`) | «És membro do plano família de **demo**» em `kfs.test.aluno@local.test` |

> Ciclo jul/2026 fechado: **5/5 checkpoints OK** após commits `e6c40fc` + `8b00f55`.

---

## 7. Comportamentos esperados (não são bugs)

- Coach sem turmas: agenda/tema/financeiro/desempenho vazios
- Coach sem permissão criar cursos
- Coach não faz check-in («plano não inclui check-in»)
- Demo: matrícula 20 € + seguro 45 € «Em atraso» no portal (coerente com «Pagamentos pendentes — 2» no admin)
- Histórico avaliações demo vazio (sem avaliações de coach)

---

## 8. Bugs corrigidos (jul/2026)

| Bug | Ficheiros | Commit |
|-----|-----------|--------|
| Presença admin vazia | `app/admin/presenca/page.tsx` | `e6c40fc` |
| KPI presença / modalidades 30d | `lib/admin-dashboard-stats.ts` | `e6c40fc` |
| KPI receita + gráfico `/null` | `lib/admin-dashboard-stats.ts` | `e6c40fc` |
| Banner titular «—» | `lib/family-group.ts` | `e6c40fc` + follow-up Student RLS |

---

## 9. Como repetir a varredura

1. Abrir 3–4 sessões isoladas (admin, coach, aluno demo, aluno família) ou relogar entre perfis.
2. Aceitar cookies; usar contas da secção 2.
3. Percorrer inventário secção 4 (smoke: carrega sem erro).
4. Executar checkpoints secção 5.
5. Registar resultados numa nova linha na secção 6 (data + commit deploy).
6. Reportar apenas **bugs novos** ou regressões; **limpar dados da secção 3** após validar (script SQL).

**Testes automáticos (local):**

| Comando | Uso |
|---------|-----|
| `npm test` | Unitários (Vitest), incl. `lib/library-improve-suggestions.test.ts` |
| `npm run test:e2e` | Playwright — smoke público; fluxos autenticados com `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` |
| `npm run lighthouse:mobile` | Lighthouse CI mobile em `kingdomfight.com` (requer `@lhci/cli`) |

**Após merge grande:** repetir secções 4–5 + validar manualmente:

- **«Ver como melhorar»:** `/dashboard` (metas de avaliação com link biblioteca) e `/dashboard/performance` (secção «Ver como melhorar na biblioteca»).
- **Peso pós-treino:** check-in → modal «Registar RPE e peso» → `/dashboard/bem-estar/rpe` com campo peso opcional.
- **Push (gratuito):** `/dashboard/perfil` → activar push (requer VAPID na Vercel + migração `PushSubscription`).
- **RBAC:** `/admin/permissoes` — atribuir permissões granulares a conta teste coach/admin.

Não substitui smoke manual em produção (`https://kingdomfight.com`).

---

*Ver também:* [`memory.md`](memory.md) (secção Admin — presença e KPIs), [`GUIA_TESTE_VALIDACAO_PERFIS.md`](GUIA_TESTE_VALIDACAO_PERFIS.md).
