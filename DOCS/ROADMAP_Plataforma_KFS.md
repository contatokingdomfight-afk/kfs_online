# Roadmap – Plataforma Kingdom Fight School

> O que **já está feito** vs **por fazer**, alinhado ao [Plano de Negócios](./Plano_de_Negócios_Kingdom_Fight_School.md) e à [Especificação Kingdom Digital](./Especificacao_Plataforma_Kingdom_Digital.md).  
> **Última revisão (documentação):** 19 maio 2026 — Tribo (comunidade): doc MVP [`TRIBO_MVP.md`](TRIBO_MVP.md); eventos no dashboard aluno (filtro inscritos, strip próximos eventos); centrais `/admin/notificacoes` e `/coach/notificacoes`; notificações in-app para inscrições em eventos — `DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md` e `DOCS/memory.md`.  
> *Histórico:* 19 maio 2026 — Tribo: `TRIBO_MVP.md` + secção 7 na Especificação Kingdom Digital; 10 fevereiro 2026 — dashboard aluno Lisboa + Presencial I; 27 abr. 2026 (RBAC + `PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`); 22 abr. 2026 (anamnese, avatar); 18 abr. 2026 (ranking); alinhamento admin/Resend/RLS, sessão mobile, Stripe, índice `DOCS/`.

**Legenda:** **Feito** = em produção. **Por fazer** = não implementado ou só operacional (dados em falta).

---

## Resumo executivo — por fazer (produto)

| Prioridade | Área | O quê |
|------------|------|--------|
| 1 | Comunidade | **Tribo** — feed social (fotos/vídeos, comentários, curtidas, partilhas); BD + Storage + moderação — especificação MVP: [`TRIBO_MVP.md`](TRIBO_MVP.md) |
| 2 | Gamificação | **Rank v2** — filtro por período; ranking por evolução nas dimensões (não só XP); anti-abuso |
| 3 | Performance | **«Ver como melhorar»** nos critérios → ligação a conteúdos da biblioteca |
| 4 | Avaliação (dados) | Completar **critérios dos 5 pilares** na BD por modalidade (foco **BJJ / MMA** onde faltar) — o Admin **Avaliação** já existe |
| 5 | Bem-estar | **Biometria** além do autorrelato (dispositivos / métricas) — v1 check-in + agregados já feitos |
| 6 | Mobile | **Capacitor** + lojas; testes em dispositivos reais (**PWA** web já feito — `DOCS/PWA.md`) |
| 7 | Notificações | **Push** no browser *(in-app na plataforma, incl. eventos — ver `DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`)* |
| 8 | Qualidade | **E2E** (ex. Playwright); relatórios/alertas no financeiro admin; **Lighthouse** em produção |
| 9 | Bem-estar / check-in | **Peso após o treino** no fluxo de recolha biométrica do check-in (além do pré-aula) — permitir estimar **variação de peso/líquido por sessão** e **médias por aluno** (com contexto: modalidade, duração, hidratação já recolhida) |
| 10 | Avaliação física / aluno | **Antropometria alargada na ficha (anamnese)** + **avatar corporal** derivado dos dados (MVP 2D/SVG ilustrativo; futuro: ajuste de atributos / cenários de meta); ver §2c |
| 11 | Admin / plataforma | **Permissões (RBAC)** — ecrã admin e modelo: controlar o que cada utilizador de backoffice vê/edita/executa; fases em [`PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`](./PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md) (alinhado a RLS + server actions) |

**Já entregue (alto nível):** Auth Supabase, multi-escola, turmas/recorrência, check-in + bem-estar no check-in, planos Stripe + presencial + crons Lisboa, biblioteca 360º, loja/eventos, gamificação (XP, faixas, missões, badges, **rank v1** com filtros escola/modalidade/faixa etária e **RPCs na BD de produção**), tema da semana, emails Resend (presença + lembretes) + SMTP Supabase, i18n PT/EN, dark/light, **definir Professor/Administrador** em qualquer `User.role` (`promoteStudentToRole`), UI em `/admin/alunos/[id]` e `/coach/alunos/[id]` (admin logado).

---

## 1. Autenticação e perfis

| Item | Estado | Notas |
|------|--------|--------|
| Login / Supabase Auth | Feito | Redirect `?next=` para check-in quando aplicável |
| Sincronização User + Student | Feito | `syncUser`; role inicial ALUNO |
| Roles ALUNO / COACH / ADMIN | Feito | `User.role` |
| Áreas aluno / coach / admin | Feito | Rotas `/dashboard`, `/coach`, `/admin` |
| Sessão após idle (mobile / PWA) | Feito | Middleware só `getUser()`; `AuthSessionKeepAlive` (`startAutoRefresh`, `resume`, intervalo ~45 min com separador visível) — `memory.md` §3.2 |

---

## 2. Aluno — dashboard, presença, performance

| Item | Estado | Notas |
|------|--------|--------|
| Dashboard, carrosséis, aulas livres (`isOpenClass`) | Feito | `lib/dashboard-lesson-filter.ts` — semana em **Lisboa** (`getThisWeekRangeLisbon` + `calendarDateLisbon` em `app/dashboard/page.tsx`); com plano **uma modalidade** (ex. Presencial I) filtra aulas fechadas à modalidade e mostra **todas** as aulas abertas; `getCachedLocations` via re-export em `lib/plan-access.ts` |
| Check-in, histórico, QR (coach) | Feito | `/check-in/[lessonId]`, `Attendance`, Lisboa |
| Performance, radar SVG, missões, conquistas, rank (v1) | Feito | `get_leaderboard_filtered` + `get_leaderboard_my_school` (migrações `20260402120000` / `20260412120000`); `lib/leaderboard.ts` (fallback se RPC ausente); filtros em `/dashboard/rank` |
| Metas assiduidade, IMC, metas avaliação | Feito | Admin configurações + dashboard |
| Bem-estar (hub, RPE, dores, peso, benchmarks) | Feito | `memory.md` §3.15 |
| «Ver como melhorar» → biblioteca | **Por fazer** | Tabela «Resumo executivo», prioridade 3 |

---

## 2b. Admin — critérios de avaliação

| Item | Estado | Notas |
|------|--------|--------|
| Pilares, subcategorias, critérios por modalidade | Feito | `/admin/avaliacao` |
| Replicar critério em várias modalidades | Feito | |
| Config sem cache obsoleto | Feito | `load-evaluation-config.ts` |

---

## 2c. Ficha de anamnese / avaliação física — antropometria e avatar

Objetivo: enriquecer a ficha com **circunferências e medidas** que permitam um **avatar corporal ilustrativo** (não clínico) e, mais tarde, **exploração visual** de atributos ligados a dados ou a metas explícitas.

| Item | Estado | Notas |
|------|--------|--------|
| **Circunferências e medidas** na ficha | **Feito** | Campos opcionais em cm + calçado (texto) + comprimento do pé; `PhysicalAssessmentFormData` + `savePhysicalAssessment`; persistência em `StudentPhysicalAssessment.formData` (JSON; sem migração colunar). Formulário: `/coach/alunos/[id]/avaliacao-fisica` |
| **Avatar corporal** (MVP) | **Feito** | Silhueta **2D/SVG** parametrizada (`lib/illustrative-body-silhouette.ts`, `components/IllustrativeBodyAvatar.tsx`, `lib/illustrative-body-2d-pipeline.ts`): aparece no resumo do aluno (`PhysicalAssessmentSummary`) e na ficha do atleta (`/coach/atletas/[id]`) quando existem **≥2** medidas antropométricas na última avaliação; copy **ilustrativo** + data da ficha. Especificação e regressão: **`DOCS/SILHUETA_CORPORAL_2D_ILUSTRATIVA.md`** |
| **Privacidade e permissões** | **Parcial** | Silhueta visível ao aluno em **Performance** (`/dashboard/performance`), 2.º painel do carrossel junto ao radar, com copy ilustrativo; coach mantém perfil aluno/atleta; sem partilha pública |
| **Futuro: “mexer nos atributos”** | **Por fazer** | Cenários / **metas** (“e se…”) com distinção explícita de **projecção** vs. dados reais da última avaliação; evitar substituir a ficha clínica |

---

## 3. Check-in e presença operacional

| Item | Estado | Notas |
|------|--------|--------|
| Confirmação coach, RSVP aula livre | Feito | |
| Email presença confirmada + lembrete amanhã | Feito | `lib/notifications/email.ts`, cron `lesson-reminders` |
| Admin lista presenças | Feito | `/admin/presenca` |
| **Peso pós-treino** (check-in biométrico) | **Por fazer** | Campo opcional após a aula (app ou janela temporal pós-check-in); BD (`PreLessonWellness` estende ou registo pós-aula ligado a `Attendance` + `occurrenceDate`); agregados no hub bem-estar / visão coach — média de **Δ peso** por sessão (proxy perda de líquido) e tendência por aluno |

---

## 4. Admin — alunos

| Item | Estado | Notas |
|------|--------|--------|
| Lista, convite, edição, planos, acesso total | Feito | |
| **Definir Professor / Administrador** | Feito | `promoteStudentToRole` — qualquer papel atual; no-op se igual; `AdminAlunoQuickActions` em `/admin/alunos/[id]` e `/coach/alunos/[id]` (admin) |
| **Ecrã e modelo de permissões (RBAC)** | **Por fazer** | Ver [`PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`](./PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md): permissões v1, guards no servidor, UI `/admin`, alinhamento RLS |

---

## 5. Admin — planos

| Item | Estado | Notas |
|------|--------|--------|
| CRUD, camelCase PostgREST (`priceMonthly`, `isActive`, …) | Feito | `memory.md` §3.16 |
| Lista com sessão; `escolher-plano` + `default-school-001` | Feito | |
| Mensalidades / crons | Feito | `DOCS/PAGAMENTOS_MENSALIDADES_CRON.md` |

---

## 6–12. Outros módulos admin / coach / público

**Feito:** atletas, missões, turmas (incl. `isOpenClass`), experimentais, coaches (N:N escolas), financeiro (Stripe + presencial + crons), área coach (agenda, aula, alunos, avaliação física, tema da semana, round timer), landing + aula experimental.

---

## 13. Modelo de dados (BD)

Principais entidades **em uso:** `User`, `Student`, `StudentProfile`, `Coach`, `CoachSchool`, `Athlete`, `Lesson`, `LessonCoach`, `LessonCancellation`, `Attendance`, `Plan`, `Payment`, `MissionTemplate`, cursos/biblioteca, loja/eventos, `PreLessonWellness`, etc. — alinhado a `prisma/schema.prisma` e migrações em `supabase/migrations/`.

**Plan (API):** usar **camelCase** nas queries Supabase (`priceMonthly`, `includesDigitalAccess`, `modalityScope`, `isActive`).

---

## 14. Especificação Kingdom Digital — estado

| Bloco especificação | Estado |
|---------------------|--------|
| Performance + KPIs + sugestões biblioteca + biométricos check-in | **Feito** (falta ligação «ver como melhorar» → biblioteca); **extensões:** peso pós-treino (§3, prioridade 9); antropometria + avatar ilustrativo (§2c — coach + aluno em `/dashboard/performance`, 2.º painel do carrossel) |
| Biblioteca 360º | **Feito** |
| Gamificação + presença (exc. rank v2 / Battle Pass) | **Feito** |
| Sala invertida (tema da semana) | **Feito** |
| Loja / eventos | **Feito** (incl. `/dashboard/eventos`, strip na home, notificações in-app de inscrição — `DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`) |
| Tribo (comunidade) | **Por fazer** — [`TRIBO_MVP.md`](TRIBO_MVP.md) |

---

## 15. Stack e deploy

| Item | Estado |
|------|--------|
| Next.js 15, Node 20, Vercel | Feito |
| Crons (`lesson-reminders`, `payment-suspension`) + `CRON_SECRET` | Feito |
| Vitest (`npm test`), seed testes | Feito |
| Emails Resend + doc | Feito — `DOCS/CONFIGURAR_RESEND.md` |
| PWA | Feito — `DOCS/PWA.md` |
| RPCs ranking na BD | Feito — `DOCS/APLICAR_MIGRATIONS_SUPABASE.md` (Ranking); novos projetos Supabase: aplicar `20260402120000` e `20260412120000` em ordem |
| Capacitor / lojas | Por fazer |

---

## Referências

- Contexto técnico detalhado: [`memory.md`](memory.md)  
- Índice de todos os `.md`: [`INDEX.md`](INDEX.md)  
- Migrações: [`APLICAR_MIGRATIONS_SUPABASE.md`](APLICAR_MIGRATIONS_SUPABASE.md)
