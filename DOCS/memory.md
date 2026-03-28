# Índice de contexto (memory) – KFS Online

> **Para continuar noutro chat:** lê este ficheiro primeiro; a documentação de produto e decisões está em **`DOCS/`** (não em `docs/`). Regra do projeto: `.cursor/rules/documentacao-projeto.mdc`.

**Última revisão:** março 2026.

---

## 1. O que é o projeto

- **Nome repo:** `kfs_online` (ex.: GitHub `contatokingdomfight-afk/kfs_online`).
- **Produto:** Plataforma Kingdom Fight School — alunos, coaches, admin; presenças, planos, biblioteca, gamificação, financeiro (Stripe + presencial), multi-escola.
- **Stack:** Next.js **15** (App Router), React 18, TypeScript, Tailwind, **Supabase** (Auth + Postgres), Prisma (schema alinhado à BD), Vercel, Stripe, Resend.
- **Node:** `20.x` (`package.json` engines).

---

## 2. Onde está cada coisa

| Área | Local |
|------|--------|
| Rotas e páginas | `app/` |
| Componentes | `components/` |
| Lógica partilhada | `lib/` |
| Migrações SQL Supabase | `supabase/migrations/` |
| Schema Prisma | `prisma/schema.prisma` |
| Scripts (ex.: seed testes) | `scripts/seed-test-users.ts` |
| Documentação canónica | **`DOCS/`** |
| Roadmap feito/por fazer | `DOCS/ROADMAP_Plataforma_KFS.md` |
| Mensalidades / crons / Lisboa | `DOCS/PAGAMENTOS_MENSALIDADES_CRON.md` |
| Contas de teste + `npm test` | `DOCS/CONTAS_TESTE.md` |
| Checklist manual por perfil | `DOCS/GUIA_TESTE_VALIDACAO_PERFIS.md` |
| Índice na raiz | `INDICE_DOCUMENTACAO.md`, `README.md`, `PROXIMOS_PASSOS.md` |

---

## 3. Entregas recentes (contexto técnico)

### 3.1 Aulas livres (`Lesson.isOpenClass`)

- **Regra:** Qualquer aluno da **escola** pode participar (dashboard, RSVP, check-in), **incluindo sem `planId`** ou plano sem check-in.
- **Ficheiros:** `lib/dashboard-lesson-filter.ts` (filtro da semana), `app/dashboard/page.tsx`, `app/dashboard/NextLessonCard.tsx`, `lib/perform-check-in.ts`, `app/dashboard/actions.ts` (`setAttendanceIntention`).
- **Migração:** `supabase/migrations/20260326140000_lesson_open_class.sql` (se aplicável ao teu projeto Supabase).

### 3.2 Testes e seed

- **Unitários:** `npm test` (Vitest) — `lib/dashboard-lesson-filter.test.ts`.
- **Contas de teste:** `npm run seed:test-users` — precisa `TEST_SEED_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, escola ativa; emails em **`DOCS/CONTAS_TESTE.md`**. Ordem dotenv no script: `.env` → `.env.local` (override); **gravar** `.env` antes de correr.

### 3.3 Financeiro – um pagamento por aluno e mês

- **`createPayment`** consolida linhas em `Payment` para o mesmo `studentId` + `referenceMonth`: registar **Pago** quando já existia **Em atraso** (ex.: mensalidade gerada) **atualiza** o registo em vez de criar duplicado. Ver **`DOCS/PAGAMENTOS_MENSALIDADES_CRON.md`**.

### 3.4 Admin – Turmas

- Vista **por semana** / por modalidade; criação de aulas (incl. recorrente / one-off) — ver `app/admin/turmas/`.

### 3.5 Histórico útil (sessões anteriores)

- **Mobile:** avaliação no `CoachStudentProfileModal` (select 1–10, toques maiores).
- **Admin:** `clearStudentPlanAccess` — remover plano / subscrição (`app/admin/alunos/actions.ts`).
- **Feedback aluno:** `lib/resolve-coach-feedback.ts`; comentários `SHARED` vs `PRIVATE`.

---

## 4. Comandos rápidos

```bash
npm install
npm run dev
npm run build
npm test
npm run seed:test-users   # ver DOCS/CONTAS_TESTE.md
```

---

## 5. Pendências / evoluções (não bloqueantes)

- Editar visibilidade de comentários antigos (PRIVATE ↔ SHARED) — não implementado.
- Roadmap opcional: BJJ/MMA, biometria, Battle Pass, PWA/Capacitor, push, E2E — ver **`DOCS/ROADMAP_Plataforma_KFS.md`** secções 14–17.

---

## 6. Continuar noutro chat — prompt sugerido

Cola algo como:

> Lê `DOCS/memory.md` e o roadmap em `DOCS/ROADMAP_Plataforma_KFS.md`. Quero continuar [descreve a tarefa].

---

*Este ficheiro é o índice de contexto interno; ao alterar comportamento visível ou regras de negócio, atualiza a secção relevante aqui ou o doc específico em `DOCS/`.*
