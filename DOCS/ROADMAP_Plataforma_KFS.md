# Roadmap – Plataforma Kingdom Fight School

> O que **já está feito** vs **por fazer**, alinhado ao [Plano de Negócios](./Plano_de_Negócios_Kingdom_Fight_School.md) e à [Especificação Kingdom Digital](./Especificacao_Plataforma_Kingdom_Digital.md).  
> **Última revisão:** abril 2026 — ranking em produção (`get_leaderboard_my_school` + `get_leaderboard_filtered` na BD); fallback e mensagem i18n se RPC em falta noutro projeto; admin alunos/papéis, Resend, planos camelCase + RLS.

**Legenda:** **Feito** = em produção. **Por fazer** = não implementado ou só operacional (dados em falta).

---

## Resumo executivo — por fazer (produto)

| Prioridade | Área | O quê |
|------------|------|--------|
| 1 | Comunidade | **Tribo** — feed social (fotos/vídeos, comentários, curtidas, partilhas); BD + Storage + moderação |
| 2 | Gamificação | **Rank v2** — filtro por período; ranking por evolução nas dimensões (não só XP); anti-abuso |
| 3 | Performance | **«Ver como melhorar»** nos critérios → ligação a conteúdos da biblioteca |
| 4 | Avaliação (dados) | Completar **critérios dos 5 pilares** na BD por modalidade (foco **BJJ / MMA** onde faltar) — o Admin **Avaliação** já existe |
| 5 | Bem-estar | **Biometria** além do autorrelato (dispositivos / métricas) — v1 check-in + agregados já feitos |
| 6 | Mobile | **Capacitor** + lojas; testes em dispositivos reais (**PWA** web já feito — `DOCS/PWA.md`) |
| 7 | Notificações | **Push** no browser |
| 8 | Qualidade | **E2E** (ex. Playwright); relatórios/alertas no financeiro admin; **Lighthouse** em produção |

**Já entregue (alto nível):** Auth Supabase, multi-escola, turmas/recorrência, check-in + bem-estar no check-in, planos Stripe + presencial + crons Lisboa, biblioteca 360º, loja/eventos, gamificação (XP, faixas, missões, badges, **rank v1** com filtros escola/modalidade/faixa etária e **RPCs na BD de produção**), tema da semana, emails Resend (presença + lembretes) + SMTP Supabase, i18n PT/EN, dark/light, **definir Professor/Administrador** em qualquer `User.role` (`promoteStudentToRole`), UI em `/admin/alunos/[id]` e `/coach/alunos/[id]` (admin logado).

---

## 1. Autenticação e perfis

| Item | Estado | Notas |
|------|--------|--------|
| Login / Supabase Auth | Feito | Redirect `?next=` para check-in quando aplicável |
| Sincronização User + Student | Feito | `syncUser`; role inicial ALUNO |
| Roles ALUNO / COACH / ADMIN | Feito | `User.role` |
| Áreas aluno / coach / admin | Feito | Rotas `/dashboard`, `/coach`, `/admin` |

---

## 2. Aluno — dashboard, presença, performance

| Item | Estado | Notas |
|------|--------|--------|
| Dashboard, carrosséis, aulas livres (`isOpenClass`) | Feito | `lib/dashboard-lesson-filter.ts` |
| Check-in, histórico, QR (coach) | Feito | `/check-in/[lessonId]`, `Attendance`, Lisboa |
| Performance, radar SVG, missões, conquistas, rank (v1) | Feito | RPC `get_leaderboard_filtered`; filtros escola/modalidade/faixa etária |
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

## 3. Check-in e presença operacional

| Item | Estado | Notas |
|------|--------|--------|
| Confirmação coach, RSVP aula livre | Feito | |
| Email presença confirmada + lembrete amanhã | Feito | `lib/notifications/email.ts`, cron `lesson-reminders` |
| Admin lista presenças | Feito | `/admin/presenca` |

---

## 4. Admin — alunos

| Item | Estado | Notas |
|------|--------|--------|
| Lista, convite, edição, planos, acesso total | Feito | |
| **Definir Professor / Administrador** | Feito | `promoteStudentToRole` — qualquer papel atual; no-op se igual; `AdminAlunoQuickActions` em `/admin/alunos/[id]` e `/coach/alunos/[id]` (admin) |

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
| Performance + KPIs + sugestões biblioteca + biométricos check-in | **Feito** (falta ligação «ver como melhorar» → biblioteca) |
| Biblioteca 360º | **Feito** |
| Gamificação + presença (exc. rank v2 / Battle Pass) | **Feito** |
| Sala invertida (tema da semana) | **Feito** |
| Loja / eventos | **Feito** |
| Tribo (comunidade) | **Por fazer** |

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
