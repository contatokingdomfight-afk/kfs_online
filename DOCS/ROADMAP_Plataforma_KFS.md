# Roadmap – Plataforma Kingdom Fight School

> O que **já está feito** vs **por fazer**, alinhado ao [Plano de Negócios](./Plano_de_Negócios_Kingdom_Fight_School.md) e à [Especificação Kingdom Digital](./Especificacao_Plataforma_Kingdom_Digital.md).  
> **Última revisão (documentação):** 22 setembro 2026 (3.ª revisão do dia) — §16 novo: backlog de crescimento (growth/marketing), 9 ideias de brainstorm para atrair alunos e professores (Fighter Card partilhável, boletim dos pais, perfil público do treinador, retrospetiva semestral, feedback de técnica por IA, entre outras). *Antes, no mesmo dia:* RBAC fase 2 (permissões granulares em todas as server actions de admin/coach), medalhas do rank, filtros do rank colapsáveis, modal de carregamento em todos os formulários de guardar; e ainda antes: Tribo (moderação admin), Rank v2 (período/evolução/anti-abuso), critérios BJJ/MMA + Muay Thai Kids/Boxing Kids, adesão sem plano + assinatura presencial + troca de email de login, qualidade (CI automatizado, testes, alerta financeiro semanal); corrigidas contradições do doc (Push Web e «ver como melhorar» já estavam feitos, mas ainda constavam como por fazer). *Anterior:* junho 2026 — seguro, matrícula, 1.º pagamento, gate presencial — [`FINANCEIRO_INSCRICAO_SEGURO.md`](FINANCEIRO_INSCRICAO_SEGURO.md).

**Legenda:** **Feito** = em produção. **Por fazer** = não implementado ou só operacional (dados em falta).

---

## Resumo executivo — por fazer (produto)

| Prioridade | Área | O quê |
|------------|------|--------|
| 1 | Mobile | **PWA** no site (feito — marca 2026, `kfs-app-icon.png`, splash preto — [`PWA.md`](PWA.md)). **Capacitor:** scaffold + OAuth feito (`CAPACITOR.md`); **por fazer:** builds assinados, App Links, **publicação nas lojas** (Apple/Google — maioritariamente do lado do utilizador: contas developer) |
| 2 | Bem-estar | **Biometria** além do autorrelato (dispositivos / métricas) — v1 check-in + agregados já feitos |
| 3 | Bem-estar / check-in | **Peso após o treino**: campo de captura já feito (`Attendance.postWeightKg`); falta a **análise** — estimar **variação de peso/líquido por sessão** e **médias por aluno** (com contexto: modalidade, duração, hidratação já recolhida) |
| 4 | Avaliação física / aluno | **Futuro:** cenários / metas ("e se…") sobre o avatar corporal, com distinção explícita de projeção vs. dados reais da última avaliação; ver §2c (antropometria + avatar MVP já feitos) |
| 5 | Avaliação (dados) | Critérios dos 5 pilares completos para **BJJ / MMA** (feito) e **Muay Thai Kids / Boxing Kids** (feito — reaproveitam critérios das versões adultas); **Karate / outras modalidades ainda não activas na escola** — baixa prioridade até existir procura |
| 6 | Admin / plataforma | **Permissões (RBAC) — fase 4/5** (feito v1 + fase 2, ver abaixo): falta auditoria (log de quem alterou o quê) — fases 4–5 de [`PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`](./PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md); baixa prioridade, sem incidentes que a justifiquem ainda |
| 7 | Crescimento (growth) | **Fighter Card partilhável — feito** (ver `FIGHTER_CARD_MVP.md`). Por fazer: **boletim dos pais (Kids)** e **perfil público do treinador** — próximas de maior interesse do brainstorm; ver §16 para a lista completa (9 ideias, incl. retrospetiva semestral e feedback de técnica por IA) |

**Já entregue (alto nível):** Auth Supabase, multi-escola, turmas/recorrência, check-in + bem-estar no check-in, planos Stripe + presencial + crons Lisboa, biblioteca 360º, loja/eventos, gamificação (XP, faixas, missões, badges, **rank v1 e v2** — filtros escola/modalidade/faixa etária, **filtro por período**, **ranking por evolução** nas dimensões e **anti-abuso** (1 avaliação/atleta/modalidade/dia), com RPCs e snapshot diário de XP na BD de produção), tema da semana, emails Resend (presença + lembretes) + SMTP Supabase, **Push Web (VAPID)** com mirror in-app, i18n PT/EN, dark/light, **definir Professor/Administrador** em qualquer `User.role` (`promoteStudentToRole`), UI em `/admin/alunos/[id]` e `/coach/alunos/[id]` (admin logado), **Tribo MVP completo** (feed, media, curtidas, comentários, partilha `/t/p` → registo, **moderação admin** em `/admin/tribo`), **«ver como melhorar»** (radar → sugestões da biblioteca por eixo fraco), **critérios de avaliação BJJ/MMA** e alias Muay Thai Kids/Boxing Kids, **adesão sem plano mensal** (assinatura presencial pelo admin para Kids, troca de email de login sintético→real, lista `/admin/documentos-adesao` de pendentes + lembrete WhatsApp), **qualidade**: CI automatizado no GitHub Actions (lint + typecheck + testes em cada push/PR), E2E (Playwright) e Lighthouse agendados, testes unitários das fichas físicas, alerta financeiro semanal por email ao admin, **RBAC fase 2** (permissões granulares aplicadas a todas as ~160 server actions de `/admin` e `/coach`, não só à navegação), **medalhas 🥇🥈🥉** no pódio do rank, **filtros do rank colapsáveis** e **modal de carregamento** em todos os formulários de guardar do site, **Fighter Card partilhável** (`/t/f/[studentId]`, imagem gerada com `next/og`, partilha WhatsApp/Instagram Stories, opt-in, ligado ao sistema de indicação existente — ver `FIGHTER_CARD_MVP.md`).

---

## 1. Autenticação e perfis

| Item | Estado | Notas |
|------|--------|--------|
| Login / Supabase Auth | Feito | Redirect `?next=` para check-in quando aplicável |
| Sincronização User + Student | Feito | `syncUser`; role inicial ALUNO |
| Roles ALUNO / COACH / ADMIN | Feito | `User.role` |
| Áreas aluno / coach / admin | Feito | Rotas `/dashboard`, `/coach`, `/admin` |
| Sessão após idle (mobile / PWA) | Feito | `AuthSessionKeepAlive`, cookies `kfs_auth_long` — [`memory.md`](memory.md) (Sessão web), [`PWA.md`](PWA.md) |
| Treinador assistente (escola) | Feito | `SchoolAssistantCoach`, rotas limitadas coach + eventos escola — [`memory.md`](memory.md) |
| Confirmação de conta / reset de password por email | Feito (código) — **falta passo manual na Supabase** | Corrige erro no iPhone (link de confirmação a falhar) trocando PKCE por `token_hash`/`verifyOtp` — [`AUTH_EMAIL_CONFIRM.md`](AUTH_EMAIL_CONFIRM.md); exige trocar os templates "Confirm signup" e "Reset Password" na Supabase, sem isso o fix não tem efeito |

---

## 2. Aluno — dashboard, presença, performance

| Item | Estado | Notas |
|------|--------|--------|
| Dashboard, carrosséis, aulas livres (`isOpenClass`) | Feito | `lib/dashboard-lesson-filter.ts` — semana em **Lisboa** (`getThisWeekRangeLisbon` + `calendarDateLisbon` em `app/dashboard/page.tsx`); com plano **uma modalidade** (ex. Presencial I) filtra aulas fechadas à modalidade e mostra **todas** as aulas abertas; `getCachedLocations` via re-export em `lib/plan-access.ts` |
| Check-in, histórico, QR (coach) | Feito | `/check-in/[lessonId]`, `Attendance`, Lisboa |
| Performance, radar SVG, missões, conquistas, rank (v1 + v2) | Feito | `get_leaderboard_filtered` (5 args, `p_period_start`) + `get_leaderboard_my_school`; `lib/leaderboard.ts`, `lib/rank-filters.ts` (filtro por período), `lib/rank-evolution.ts`/`lib/leaderboard-evolution.ts` (ranking por evolução nas dimensões); anti-abuso `lib/evaluation-rate-limit.ts` (1 avaliação/atleta/modalidade/dia Lisboa); snapshot diário `AthleteXpSnapshot` (cron `xp-snapshot`); filtros em `/dashboard/rank` |
| Metas assiduidade, IMC, metas avaliação | Feito | Admin configurações + dashboard |
| Bem-estar (hub, RPE, dores, peso, benchmarks) | Feito | `memory.md` §3.15 |
| «Ver como melhorar» → biblioteca | **Feito** | `lib/library-improve-suggestions.ts`; links dashboard + performance |

---

## 2b. Admin — critérios de avaliação

| Item | Estado | Notas |
|------|--------|--------|
| Pilares, subcategorias, critérios por modalidade | Feito | `/admin/avaliacao` |
| Replicar critério em várias modalidades | Feito | |
| Config sem cache obsoleto | Feito | `load-evaluation-config.ts` |
| Critérios técnicos e táticos — BJJ e MMA/grappling | Feito | Migrações `20260918120000_seed_bjj_evaluation` (9 dimensões técnicas + 8 táticas) e `20260918130000_seed_mma_grappling_evaluation` (7 técnicas + 8 táticas); `dimensionCodeToGeneralDimension` em `lib/performance-utils.ts` mapeia prefixos `BJJ_`/`MMA_` ao pilar "Técnico" |
| Muay Thai Kids / Boxing Kids avaliam-se como as versões adultas | Feito | Alias `EVALUATION_CONFIG_ALIAS` em `lib/load-evaluation-config.ts` (`MTKIDS`→`MUAY_THAI`, `BKIDS`→`BOXING`), sem duplicar dados |
| Karate e outras modalidades ainda não activas | **Por fazer (baixa prioridade)** | Sem critérios na BD; só relevante quando a escola passar a oferecer a modalidade |

---

## 2c. Ficha de anamnese / avaliação física — antropometria e avatar

Objetivo: enriquecer a ficha com **circunferências e medidas** que permitam um **avatar corporal ilustrativo** (não clínico) e, mais tarde, **exploração visual** de atributos ligados a dados ou a metas explícitas.

| Item | Estado | Notas |
|------|--------|--------|
| **Circunferências e medidas** na ficha | **Feito** | Campos opcionais em cm + calçado (texto) + comprimento do pé; `PhysicalAssessmentFormData` + `savePhysicalAssessment`; persistência em `StudentPhysicalAssessment.formData` (JSON; sem migração colunar). Formulário: `/coach/alunos/[id]/avaliacao-fisica` |
| **Avatar corporal** (MVP) | **Feito** | Silhueta **2D/SVG** parametrizada (`lib/illustrative-body-silhouette.ts`, `components/IllustrativeBodyAvatar.tsx`, `lib/illustrative-body-2d-pipeline.ts`): aparece no resumo do aluno (`PhysicalAssessmentSummary`) e na ficha do atleta (`/coach/atletas/[id]`) quando existem **≥2** medidas antropométricas na última avaliação; copy **ilustrativo** + data da ficha. Especificação e regressão: **`DOCS/SILHUETA_CORPORAL_2D_ILUSTRATIVA.md`** |
| **Privacidade e permissões** | **Parcial** | Silhueta visível ao aluno em **Performance** (`/dashboard/performance`), 2.º painel do carrossel junto ao radar, com copy ilustrativo; coach mantém perfil aluno/atleta; sem partilha pública |
| **Futuro: “mexer nos atributos”** | **Por fazer** | Cenários / **metas** (“e se…”) com distinção explícita de **projecção** vs. dados reais da última avaliação; evitar substituir a ficha clínica |
| **Editar ficha já entregue** (admin/coach) + rasto de auditoria | Feito | Reabrir e corrigir dado em falta sem duplicar registo nem repetir notificação; `editedAt`/`editedByUserId` mostrados na vista de leitura (autoria original preservada) — `savePhysicalAssessment`, migração `20260916120000_physical_assessment_edit_audit.sql` |
| **KPIs físicos** (força, resistência, velocidade, etc.) + **evolução entre avaliações** | Feito | Perfil do Atleta (aluno/coach/admin): cartões 1–10 com tooltip explicando o cálculo + gráfico de linha por métrica entre fichas entregues; estado de "primeiro registo" quando só há 1 ficha — `lib/physical-assessment-kpi-scores.ts`, `lib/physical-assessment-evolution.ts`, `components/physical-assessment/PhysicalAssessmentEvolution.tsx` |
| Testes automatizados para `lib/physical-assessment-evolution.ts` e `lib/physical-assessment-kpi-scores.ts` | Feito | `*.test.ts` correspondentes (14 testes) |

---

## 3. Check-in e presença operacional

| Item | Estado | Notas |
|------|--------|--------|
| Confirmação coach, RSVP aula livre | Feito | |
| Email presença confirmada + lembrete amanhã | Feito | `lib/notifications/email.ts`, cron `lesson-reminders` |
| Admin lista presenças | Feito | `/admin/presenca` |
| **Peso pós-treino** (check-in biométrico) | **Feito** | Campo opcional no RPE pós-aula + `Attendance.postWeightKg`; migração `20260821160100_attendance_post_weight.sql` |

---

## 4. Admin — alunos

| Item | Estado | Notas |
|------|--------|--------|
| Lista, convite, edição, planos, acesso total | Feito | |
| **Definir Professor / Administrador** | Feito | `promoteStudentToRole` — qualquer papel atual; no-op se igual; `AdminAlunoQuickActions` em `/admin/alunos/[id]` e `/coach/alunos/[id]` (admin) |
| **Ecrã e modelo de permissões (RBAC)** | Feito | `/admin/permissoes`, migração `20260821160000_admin_rbac_permissions.sql`; guards de layout **e** de todas as ~160 server actions de `/admin` e `/coach` (fase 2 — `adminPermissionError`/`assertAdminPermission`, `lib/permissions/assert.ts`); rotas acessíveis a treinadores assistentes usam a variante `...OrSchoolAssistant`; falta só auditoria (fase 4–5, baixa prioridade) |
| **Adesão sem plano mensal** | Feito | `/adesao` já não exige `planId`; alunos avulsos assinam waiver + contrato + comprovativo na mesma; redirect automático ao entrar na plataforma com documentos por assinar (`middleware.ts`) |
| **Assinatura presencial pelo admin** | Feito | `/admin/alunos/[id]/contrato/assinar` — para alunos Kids sem acesso próprio à plataforma; reaproveita `applyEnrollmentFormSubmission`/`applyAdesaoSigning` |
| **Troca de email de login (sintético → real)** | Feito | `changeStudentLoginEmail` — quando um aluno Kids passa a ter email próprio (ex. Google), liga a conta existente ao novo email sem perder histórico |
| **Lista de documentos de adesão pendentes** | Feito | `/admin/documentos-adesao` — atalho na secção Académico do admin; botão de lembrete por WhatsApp (`buildDocumentsPendingMessage`) |

---

## 5. Admin — planos

| Item | Estado | Notas |
|------|--------|--------|
| CRUD, camelCase PostgREST (`priceMonthly`, `isActive`, …) | Feito | `memory.md` §3.16 |
| Lista com sessão; `escolher-plano` + `default-school-001` | Feito | |
| Mensalidades / crons | Feito | `DOCS/PAGAMENTOS_MENSALIDADES_CRON.md` |
| Seguro anual + waiver + matrícula | Feito | `DOCS/FINANCEIRO_INSCRICAO_SEGURO.md` |
| 1.º pagamento admin + pagamento na escola | Feito | `/admin/financeiro/primeiro-pagamento`, gate middleware |
| Pagamento antecipado (N meses) | Feito | `/admin/financeiro/antecipado` |

---

## 6–12. Outros módulos admin / coach / público

**Feito:** atletas, missões, turmas (incl. `isOpenClass`), experimentais, coaches (N:N escolas), financeiro (Stripe + presencial + crons + seguro/matrícula/1.º pagamento), área coach (agenda, aula, alunos, avaliação física, tema da semana, round timer), landing + aula experimental.

---

## 13. Modelo de dados (BD)

Principais entidades **em uso:** `User`, `Student`, `StudentProfile`, `Coach`, `CoachSchool`, `Athlete`, `Lesson`, `LessonCoach`, `LessonCancellation`, `Attendance`, `Plan`, `Payment`, `InsuranceSettings`, `StudentWaiver`, `StudentInsuranceCoverage`, `MissionTemplate`, cursos/biblioteca, loja/eventos, `PreLessonWellness`, etc. — alinhado a `prisma/schema.prisma` e migrações em `supabase/migrations/`.

**Plan (API):** usar **camelCase** nas queries Supabase (`priceMonthly`, `includesDigitalAccess`, `modalityScope`, `isActive`).

---

## 14. Especificação Kingdom Digital — estado

| Bloco especificação | Estado |
|---------------------|--------|
| Performance + KPIs + sugestões biblioteca + biométricos check-in | **Feito**, incl. «ver como melhorar» → biblioteca (`lib/library-improve-suggestions.ts`, radar → cursos por eixo fraco); **extensões por fazer:** análise/médias do peso pós-treino (§3, resumo executivo); cenários de meta sobre o avatar (§2c) |
| Biblioteca 360º | **Feito** |
| Gamificação + presença, incl. **rank v2** (período, evolução, anti-abuso; Battle Pass fora de âmbito) | **Feito** |
| Sala invertida (tema da semana) | **Feito** |
| Loja / eventos | **Feito** (incl. `/dashboard/eventos`, strip na home, notificações in-app de inscrição — `DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`) |
| Tribo (comunidade) | **Feito (MVP completo)** — feed, media, curtidas, comentários, partilha, **moderação admin** (`/admin/tribo`) — [`TRIBO_MVP.md`](TRIBO_MVP.md); `/dashboard/tribo`, `/t/p/[id]`, migração `20260520140000_tribe_mvp.sql` |

---

## 15. Stack e deploy

| Item | Estado |
|------|--------|
| Next.js 15, Node 24, Vercel | Feito |
| Crons (`lesson-reminders`, `payment-suspension`, `generate-monthly-payments`, `insurance-expiry-check`, `reengagement-check`, `xp-snapshot`, `financial-weekly-alert`) + `CRON_SECRET` | Feito |
| Vitest (`npm test`, 150 testes), seed testes | Feito |
| **CI (GitHub Actions)** | Feito — `.github/workflows/ci.yml` (lint+typecheck+testes em cada push/PR); `e2e-nightly.yml` (Playwright contra produção) e `lighthouse-weekly.yml` agendados — precisam de secrets no GitHub para correr autenticados |
| Emails Resend + doc | Feito — `DOCS/CONFIGURAR_RESEND.md` |
| Push Web (VAPID) | Feito — tabela `PushSubscription`, toggle em `/dashboard/perfil`, mirror in-app |
| PWA | Feito — `DOCS/PWA.md` |
| RPCs ranking na BD | Feito — `DOCS/APLICAR_MIGRATIONS_SUPABASE.md` (Ranking); novos projetos Supabase: aplicar `20260402120000`, `20260412120000` e `20260917130000` em ordem |
| Capacitor / lojas | **Em curso** — projetos `android/` + `ios/`; builds assinados, App Links e publicação nas lojas por fazer |

---

## 16. Backlog de crescimento (growth / marketing) — brainstorm 22 set. 2026

Ideias para atrair **novos alunos** e **novos professores**, discutidas em sessão de brainstorm. Ainda sem desenho técnico detalhado — a fazer quando entrarem em prioridade. Ordenadas pelo interesse manifestado, não por dificuldade.

| # | Item | Para quem | Estado | Notas |
|---|------|-----------|--------|-------|
| 1 | **Cartão de conquista partilhável ("Fighter Card")** | Alunos | **Feito, em produção** | Ver [`FIGHTER_CARD_MVP.md`](FIGHTER_CARD_MVP.md): imagem gerada no servidor (`next/og`), página pública `/t/f/[studentId]` (reaproveita o prefixo `/t/` já público), partilha WhatsApp + Instagram Stories via Web Share API, opt-in explícito (excluído para Kids), CTA no próprio cartão liga-se ao mecanismo de indicação já existente (`?ref=` → `referredByStudentId`). Migração `20260922120000_fighter_card_public.sql` confirmada em produção |
| 5 | **Boletim/relatório dos pais (alunos Kids)** | Alunos (pais) | **Por fazer — alta prioridade percebida** | Resumo periódico automático (presença, evolução física, conquistas) a partir de dados já existentes (KPIs físicos, `Attendance`, `AthleteEvaluation`); enviado por email e pensado para os pais partilharem |
| 7 | **Perfil público do treinador** | Professores | **Por fazer — alta prioridade percebida** | Página tipo "cartão de visita" por coach: bio, faixa, alunos formados, técnicas, avaliações de alunos. SEO + prova social + motivo de orgulho/retenção para o próprio treinador |
| 8 | **Retrospetiva semestral ("Wrapped")** | Alunos | **Por fazer — confirmado semestral** (era ideia anual, ajustada em sessão) | Cartão/página animada de resumo da jornada num período (aulas, evolução, faixa, missões), no espírito do Spotify Wrapped. Cadência: a cada 6 meses. Alto potencial viral; é conteúdo sazonal, não contínuo |
| 9 | **Feedback de técnica por vídeo com IA** | Alunos | **Por fazer — visão de futuro, sem prazo** | Aluno grava um golpe, recebe apontamentos automáticos (visão computacional / pose estimation). Ambicioso tecnicamente; diferencial único no mercado de academias. Confirmado como direção de médio/longo prazo, não para já |
| 2 | Subir o nível da indicação (`ReferralInviteSection`) | Alunos | Por fazer | Hoje é só link + contador. Ideia: níveis de indicador, badge ao 3.º amigo convertido, leaderboard de quem mais trouxe gente. Reaproveita `grantReferralRewardIfEligible` já existente |
| 3 | Quiz público "Que modalidade combina contigo?" | Alunos (leads) | Por fazer | Página pública curta que termina a recomendar modalidade e leva a marcar aula experimental. Geração de leads clássica |
| 4 | "Kingdom League" — liga/torneio entre escolas | Alunos + escolas | Por fazer | Ranking ou torneio periódico entre escolas da rede (além do rank individual já existente); reaproveita o módulo de arbitragem/pontuação já construído para eventos internos |
| 6 | Página "Torna-te treinador" (vender o revenue-share) | Professores (recrutamento) | Por fazer | `Course.coach_revenue_pct` já existe (coach cria curso, ganha %) mas está escondido dentro da app. Página pública de marketing + funil de candidatura, a vender isto explicitamente |

---

## Referências

- Contexto técnico detalhado: [`memory.md`](memory.md)  
- Índice de todos os `.md`: [`INDEX.md`](INDEX.md)  
- Migrações: [`APLICAR_MIGRATIONS_SUPABASE.md`](APLICAR_MIGRATIONS_SUPABASE.md)
