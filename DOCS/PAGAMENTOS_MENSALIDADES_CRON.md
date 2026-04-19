# Pagamentos, mensalidades, atraso e suspensão

Documentação operacional e técnica alinhada ao código (`lib/lisbon-payment-dates.ts`, `lib/renewals.ts`, `lib/payment-grace.ts`, crons em `app/api/cron/`).

## Regras de negócio (Portugal / Lisboa)

- **Fuso:** `Europe/Lisbon` para dias úteis, dia civil 10 e “mês corrente”.
- **Em atraso:** o aluno passa a ter mensalidade em atraso quando **não existe `Payment` com status `PAID`** para o `referenceMonth` (formato `YYYY-MM`) e já passou o **fim do 5.º dia útil** desse mês em Lisboa. Nessa altura o sistema pode criar o registo `Payment` com status **`LATE`** (automático ou via admin).
- **Prazo para regularizar:** até ao **fim do dia civil 10** desse mesmo mês em Lisboa (23:59:59.999). O campo `Student.paymentGraceEndsAt` guarda esse instante em UTC (derivado do fim do dia 10 em Lisboa).
- **Bloqueio sistémico:** após esse prazo, se o aluno continuar com plano ativo e sem regularização adequada, o cron de suspensão remove o `planId`, guarda o plano em `suspendedPlanId`, pode cancelar subscrição Stripe e notifica o aluno. Aplica-se a **alunos online e presenciais** (quem tem `planId`).

## O que conta como “pago no mês”

- Só **`Payment.status === "PAID"`** para aquele `referenceMonth` considera o mês liquidado.
- Um **`LATE`** no mês **não** “paga” o mês; impede duplicar geração automática de novo `LATE` para o mesmo aluno/mês.

## Crons (Vercel)

Definidos em `vercel.json`:

| Caminho | Horário (UTC) | Função |
|--------|----------------|--------|
| `/api/cron/lesson-reminders` | `0 6 * * *` | Lembretes de aulas (email Resend). |
| `/api/cron/payment-suspension` | `30 7 * * *` | (1) Gera `LATE` para **mês anterior** e **mês corrente** (Lisboa), respeitando o 5.º dia útil; (2) suspende quem ultrapassou `paymentGraceEndsAt`. |

**Autenticação:** `Authorization: Bearer <CRON_SECRET>` ou cabeçalho `x-vercel-cron: 1`. A variável **`CRON_SECRET`** deve estar definida na Vercel e no `.env` local para testes manuais.

### Endpoint opcional

- **`GET /api/cron/generate-monthly-payments`** — gera mensalidades (`LATE`) sem `?month=` para **mês anterior + corrente** (Lisboa); com `?month=YYYY-MM` apenas esse mês. Útil se quiseres agendar separadamente; o fluxo principal está integrado em `payment-suspension`.

## Admin (ação manual)

- **Gerar mensalidades** em `/admin/financeiro` usa **`force: true`**: cria `LATE` para quem não tem `PAID` e ainda não tem qualquer `Payment` naquele mês, **sem** esperar pelo 5.º dia útil (backfill / operação manual).

### Registar pagamento (consolidação por aluno + mês)

- **`createPayment`** (`app/admin/financeiro/actions.ts`) não deve deixar **duas linhas** para o mesmo `studentId` + `referenceMonth` (ex.: um `LATE` gerado automaticamente e um `PAID` registado depois).
- Ao registar **Pago** para um mês que já tinha **Em atraso**, o sistema **atualiza** o registo existente para `PAID` e remove duplicados do mesmo par aluno/mês.
- Ao tentar registar **Em atraso** quando já existe **Pago** nesse mês, devolve erro.
- **Dados antigos** (duplicados antes desta regra): Admin → Financeiro → botão **«Limpar duplicados (mesmo aluno + mês)»** (`dedupeDuplicatePaymentsAction`) ou SQL de manutenção equivalente.

## Campos em `Student` (grace e suspensão)

| Coluna | Significado |
|--------|-------------|
| `paymentGraceEndsAt` | Fim do prazo (fim do **dia 10** em Lisboa para o mês em causa), em timestamptz. |
| `paymentGraceReferenceMonth` | `YYYY-MM` da mensalidade associada ao aviso. |
| `paymentSuspendedAt` | Quando o acesso foi suspenso por falta de pagamento. |
| `suspendedPlanId` | Plano antes da suspensão; reposto após `PAID` / `clearGraceOnPaidPayment`. |

> **Nota:** a migração `20260324180000_student_payment_grace_comments.sql` atualiza os `COMMENT` na base para refletir o **fim do dia 10 em Lisboa**. Repositórios que já aplicaram migrações anteriores devem correr esta migração no Supabase.

## Dependências de datas

- **`date-fns`** e **`date-fns-tz`** — cálculo de dias úteis e instantes no fuso `Europe/Lisbon`.

## Ficheiros principais

- `lib/lisbon-payment-dates.ts` — 5.º dia útil, fim do dia 10, mês corrente/anterior em Lisboa.
- `lib/renewals.ts` — `getRenewalsPending`, `generateMonthlyPayments` (opções `force`, `now`).
- `lib/payment-grace.ts` — `startGracePeriodOnLatePayment`, `clearGraceOnPaidPayment`, `suspendStudentsPastGrace`.
- `app/admin/financeiro/actions.ts` — `createPayment` (consolida `Payment` por aluno/mês).
- `app/api/stripe/webhook/route.ts` — `PAID` via Stripe chama `clearGraceOnPaidPayment`.

---

*Última atualização: março de 2026.*

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026.*
