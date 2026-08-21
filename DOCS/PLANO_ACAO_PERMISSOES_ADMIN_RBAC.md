# Plano de Ação: Permissões de Admin (RBAC / ecrã de controlo)

> **Objetivo:** permitir que **administradores** configurem, de forma **segura e auditável**, o que **cada utilizador com acesso de backoffice** pode **ver, editar ou executar** (além dos papéis fixos `ALUNO` / `COACH` / `ADMIN` atuais em `User.role`).

**Estado:** v1 implementado (ago. 2026) — catálogo BD, UI `/admin/permissoes`, guards de layout e helper `lib/permissions/assert.ts`. Pendente: expandir guards a todas as server actions + auditoria (fases 4–5 do plano).
**Alinhado com:** [SUPABASE_RLS.md](./SUPABASE_RLS.md), [ESPECIFICACAO_DASHBOARD_ADMIN.md](./ESPECIFICACAO_DASHBOARD_ADMIN.md), [REVISAO_SEGURANCA.md](./REVISAO_SEGURANCA.md).  
**Roadmap:** [ROADMAP_Plataforma_KFS.md](./ROADMAP_Plataforma_KFS.md) (secção Admin — permissões).  
**Implementado antes do RBAC (maio 2026):** matriz de prefixos em `lib/permissions/paths.ts` (ex.: `/admin/notificacoes` → `admin:sistema:read/write`) e doc operacional [NOTIFICACOES_IN_APP_E_EVENTOS.md](./NOTIFICACOES_IN_APP_E_EVENTOS.md).

---

## 1. Princípios (não negociáveis)

1. **Enforcement no servidor:** toda ação sensível (server actions, rotas `app/api`, leitura de dados reservados) valida permissão; a UI só **esconde** atalhos.
2. **RLS no Supabase:** o modelo de permissões em `public` tem de ser **coerente** com políticas RLS (ou claims JWT), para que o cliente anon não contorne a app. Evitar “só confiar no Next.js”.
3. **Nomes estáveis:** permissões com identificadores imutáveis (ex. `admin:alunos:read`, `admin:planos:write`) — a UI e a BD usam a mesma lista.
4. **Caminho incremental:** v1 com **poucos eixos** (módulos) + leitura/escrita; evitar matriz 50×20 no primeiro release.

---

## 2. Fase 0 — Descoberta e inventário (1–2 sprints leves)

| Tarefa | Entregável |
|--------|------------|
| Listar **rotas e server actions** admin relevantes | Planilha ou tabela: módulo → ficheiro → ação (ler/escrever) |
| Mapear **quem hoje** pode fazer o quê | Matriz: `ADMIN` total vs exceções desejadas (ex.: suporte só leitura) |
| Definir **super-admin** | Ex.: `User.role = ADMIN` + sem restrição **ou** flag `isSuperAdmin` / role de sistema (decisão única) |
| Revisar **RLS** existente | Documento curto: gaps por tabela (o que ainda depende só de `role` na app) |

**Critério de saída:** lista de **permissões v1** (10–25 itens) acordada com negócio.

---

## 3. Fase 1 — Modelo de dados

| Tarefa | Notas |
|--------|--------|
| Tabela `Permission` (código, descrição, módulo, `createdAt`) | Códigos `TEXT` únicos, sem espaços |
| Tabela `UserPermission` (ou `AdminPermission`) | `userId` → `User.id`, `permissionId`, opcional `granted` boolean (se quiserem deny explícito mais tarde) |
| **Alternativa (recomendada em paralelo):** tabela `Role` + `RolePermission` + `UserAdminRole` | “Templates” (ex.: *Suporte*, *Financeiro*) reduzem cliques na UI |
| Migração Prisma + SQL em `supabase/migrations/` | Incluir seed mínimo de linhas `Permission` para v1 |
| **Decisão:** permissões aplicam-se só a `User.role = ADMIN` (e talvez `COACH` com flag futura) | Evitar poluir alunos com mil linhas |

**Critério de saída:** migração aplicada em **dev/staging**; documento de “permissões v1” com IDs.

---

## 4. Fase 2 — Camada de aplicação (TypeScript)

| Tarefa | Notas |
|--------|--------|
| `lib/permissions/constants.ts` | Mapa `PERMISSION_V1` com strings canónicas |
| `getPermissionsForUser(supabase, userId)` / `userHasPermission(...)` | Usar **service role** só onde já é padrão; em RSC, cliente autenticado com RLS ativo se possível |
| **Guard** em server actions e rotas admin | `assertPermission(user, 'admin:planos:write')` — erro 403 / redirect |
| **Cache por pedido** (opcional) | `cache()` como em `getCachedPlanAccess` para não multiplicar queries |
| Atualizar **getCurrentDbUser** ou helper `getCurrentAdminContext` | Incluir lista de permissões ou role resolvida |

**Critério de saída:** uma rota admin “piloto” (ex.: só leitura de listagem) protegida **só** por permissão nova, com teste manual + teste unitário mínimo se existir padrão no repo.

---

## 5. Fase 3 — UI Admin: ecrã de permissões

| Tarefa | Notas |
|--------|--------|
| Rota `/admin/permissoes` (ou subsecção em **Utilizadores / Contas**) | Apenas `ADMIN` com `permission:...:manage` ou super-admin (definir) |
| Lista de utilizadores com acesso a backoffice | Filtro: `role in (COACH, ADMIN)` ou política de produto |
| Vista **detalhe** por `userId` | Grupos por módulo (alunos, turmas, planos, financeiro, …); checkboxes read/write se aplicável |
| **Atribuição por template** (se `Role` existir) | “Aplicar papel *Suporte*” |
| Mensagens i18n PT/EN | Chaves em `lib/i18n` |
| Acessibilidade e mobile | Tabela responsiva ou acordeão por módulo |

**Critério de saída:** admin consegue **ler e alterar** permissões de um utilizador de teste; após relogin (ou invalidação de cache), o comportamento reflete-se nas rotas protegidas.

---

## 6. Fase 4 — Auditoria e suporte

| Tarefa | Notas |
|--------|--------|
| Tabela `AdminAuditLog` (opcional v1.1) | `actorUserId`, `targetUserId`, `action`, `payload` JSON, `createdAt` |
| Logar alterações de permissões | Mínimo: quem alterou, quando, a quem |
| Documentar **runbook** | “Utilizador X perdeu acesso a Y” — ver `AdminAuditLog` e `UserPermission` |

**Critério de saída:** equipa consegue responder “quem deu acesso a planos a esta conta?”

---

## 7. Fase 5 — Rollout e RLS (produção)

| Tarefa | Notas |
|--------|--------|
| Aplicar migrações no projeto Supabase de **produção** (janela acordada) | Ver [APLICAR_MIGRATIONS_SUPABASE.md](./APLICAR_MIGRATIONS_SUPABASE.md) |
| Ajustar **RLS** para tabelas expostas ao client | Cofre: leitura só com permissão equivalente, não só `role` |
| Backfill: utilizadores `ADMIN` existentes | Todos com conjunto “full” ou com role *Super* — alinhar com negócio |
| Comunicação interna | Changelog curto + screenshot da nova ecrã |

**Critério de saída:** produção com super-admins testados; zero regressão em fluxos aluno/coach atuais.

---

## 8. Fora de âmbito da v1 (explícito)

- Permissões **por registo** (ex.: “só edita aula X”) — **ABAC**; reservar para fase futura.
- **Feature flags** de produto (ambiente/tenant) — complementar, não misturar com RBAC de utilizador na mesma tela se possível.
- **Delegação** (“o admin B gere permissões de C”) — fase futura com cuidado jurídico/operacional.

---

## 9. Riscos e mitigação

| Risco | Mitigação |
|------|-----------|
| RLS e app desalinhados | Fase 0 + revisão; testes de integração em **staging** com `anon` key |
| Superfície de ataque (admin compartilhado) | 2FA futuro; auditoria; princípio de menor privilégio em templates |
| Complexidade de UI | Começar por módulos grossos; expandir com feedback |

---

## 10. Checklist de aceite (release v1)

- [ ] Super-admin (definição) pode tudo; utilizador restringido não vê ações proibidas na UI.
- [ ] Chamadas diretas a API / server action devolvem 403 se sem permissão.
- [ ] Documentação atualizada: `memory.md` (regra do projeto), [INDEX.md](./INDEX.md), roadmap.
- [ ] Migrações e seeds reproduzíveis em clone novo do projeto.

---

*Documento gerado para acompanhamento de produto e engenharia. Última revisão: 27 abril 2026. Referência a entregas de produto em curso: [`memory.md`](./memory.md) (ex.: secção *Dashboard aluno*).*
