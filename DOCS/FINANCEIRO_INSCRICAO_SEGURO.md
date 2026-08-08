# Financeiro — inscrição, matrícula, seguro e primeiro pagamento

Documentação operacional e técnica (junho 2026), alinhada ao código em `lib/first-payment-bundle.ts`, `lib/ensure-onboarding-pending-payments.ts`, `middleware.ts` e rotas admin/aluno.

**Relacionado:** [`PAGAMENTOS_MENSALIDADES_CRON.md`](PAGAMENTOS_MENSALIDADES_CRON.md) (mensalidades e suspensão), [`FINANCEIRO_STRIPE_E_PRESENCIAL.md`](FINANCEIRO_STRIPE_E_PRESENCIAL.md) (Stripe vs presencial), [`FLUXO_DE_CADASTRO_E_ONBOARDING.md`](FLUXO_DE_CADASTRO_E_ONBOARDING.md) (jornada do aluno).

---

## 1. Tipos de pagamento (`Payment.paymentType`)

| Tipo | Referência | `referenceMonth` | `referenceYear` | Notas |
|------|------------|------------------|-----------------|-------|
| `TUITION` | Mensalidade | `YYYY-MM` (obrigatório) | — | Crons e Stripe; índice único por aluno+mês |
| `INSURANCE` | Seguro anual (individual) | `NULL` | `YYYY` (obrigatório) | Um registo por aluno/ano civil — o seguro é sempre individual, mesmo no plano família |
| `ENROLLMENT` | Matrícula (taxa única) | `NULL` | — | Um registo por aluno (índice parcial) |

**Migração crítica:** `20260630150000_payment_reference_month_nullable.sql` — `referenceMonth` deixa de ser `NOT NULL` na BD; sem isto, o primeiro pagamento falha ao gravar seguro/matrícula (`null value in column "referenceMonth"`).

**Check constraint:** `payment_reference_month_by_type` — `TUITION` exige mês; `INSURANCE` e `ENROLLMENT` exigem `referenceMonth` null.

---

## 2. Configuração global (Admin → Configurações)

Tabela `InsuranceSettings` (`id = 'global'`), editável em `/admin/configuracoes`:

| Campo | Uso |
|-------|-----|
| `annualAmount` | Valor anual do seguro (individual, cobrado por aluno) |
| `enrollmentAmount` | Taxa de matrícula única na inscrição |
| `policyReference` | Referência da apólice (opcional) |
| `waiverVersion` | Versão do texto do termo de responsabilidade |

Código: `lib/insurance-settings.ts`.

---

## 3. Jornada do aluno (presencial — pagamento na escola)

Ordem de gates no `middleware.ts`:

1. Onboarding (`hasCompletedOnboarding`)
2. Termo de responsabilidade (`/waiver-signing`, tabela `StudentWaiver`)
3. Escolha de plano (`/escolher-plano`) se `planId` null
4. **Pagamento na secretaria** — se `planId` definido e **zero** `Payment` com `status = PAID` (excepto `adminGrantedFullAccess`)

### 3.1 Escolher plano (`/escolher-plano`)

- Action `selectPlanPayAtSchool` (`app/escolher-plano/actions.ts`) — **sem Stripe** nesta página.
- Antes de confirmar: modal `PlanSchoolPaymentModal` com mensalidade + matrícula + seguro estimados.
- Ao confirmar: atribui `planId` e chama `ensureOnboardingPendingPayments` → cria `Payment` **LATE** para:
  - mensalidade do mês corrente (Lisboa),
  - matrícula (se `enrollmentAmount > 0` e não isenta),
  - seguro do ano civil corrente (se `annualAmount > 0`).
- Redirect: `/dashboard/financeiro?pagamento_escola=1` + modal `SchoolPaymentPendingModal`.

### 3.2 Gate de acesso pós-plano

Enquanto não existir pelo menos um `PAID`:

- Aluno só acede a `/dashboard/financeiro` (e APIs necessárias a essa área).
- Resto da app redirecciona para financeiro com aviso.
- `adminGrantedFullAccess` ignora este gate.

### 3.3 Área financeira do aluno

`/dashboard/financeiro` — lista pagamentos (mensalidade, matrícula, seguro) com estados `LATE` / `PAID`.

---

## 4. Primeiro pagamento (Admin)

Rota: **`/admin/financeiro/primeiro-pagamento`**

Formulário: `PrimeiroPagamentoForm.tsx` → action `createFirstPaymentBundleAction` → `lib/first-payment-bundle.ts`.

O admin regista **um único acto** que:

1. Marca mensalidade (`TUITION`) do mês de referência como **PAID**.
2. **Matrícula** — checkbox opcional: se marcado, `ENROLLMENT` → PAID; se desmarcado e ainda pendente, isenta (`enrollmentFeeWaived = true`) e remove `LATE` de matrícula.
3. **Seguro** — obrigatório se configurado e pendente: `INSURANCE` → PAID + `renewStudentInsuranceCoverage` (datas em `StudentInsuranceCoverage`).

Pré-requisito: aluno com plano e pagamentos de inscrição em `LATE` (ou elegível via `isStudentEligibleForFirstPayment`). O aviso «inscrição pendente» no registo de pagamento **não** aparece só por mensalidades `LATE` depois de já existir algum `PAID` — ver `hasPendingOnboardingPayments`.

**Após PAID:** o middleware desbloqueia o resto da plataforma para o aluno.

---

## 5. Outros fluxos admin

| Rota | Função |
|------|--------|
| `/admin/financeiro` | Visão geral, renovações, LATE, receita |
| `/admin/financeiro/novo` | Registar pagamento avulso (mensalidade) |
| `/admin/financeiro/antecipado` | N meses `TUITION` + PAID antecipados |
| `/admin/financeiro/primeiro-pagamento` | Bundle inscrição (mensalidade + matrícula + seguro) |
| `/admin/configuracoes` | Valores seguro e matrícula |
| `/admin/alunos/[id]` | Secção seguro/waiver (`StudentInsuranceSection.tsx`) |

Geração automática de LATE na atribuição de plano (admin ou Stripe sem plano anterior): `lib/ensure-onboarding-pending-payments.ts`.

---

## 6. Seguro e termo de responsabilidade

### Tabelas

- `StudentWaiver` — assinatura digital do termo (`/waiver-signing`).
- `StudentInsuranceCoverage` — cobertura anual (`covered`, `coverageStartDate`, `coverageEndDate`, renovação).

Contas existentes na migração inicial recebem waiver `legacy` (não bloqueadas).

### Check-in

**Seguro opcional (ago. 2026):** o check-in **não** depende do seguro — só do plano/mensalidade em dia. O bloqueio por cobertura expirada/inactiva foi **removido** (`lib/perform-check-in.ts`); o seguro fica informativo + alerta ao admin.

### Cron

`GET /api/cron/insurance-expiry-check` — segundas 08:00 UTC (`vercel.json`); email admin (`INSURANCE_ALERT_ADMIN_EMAIL`).

---

## 7. Stripe (comparação)

| Aspecto | Presencial (escola) | Stripe |
|---------|---------------------|--------|
| Escolha de plano | `/escolher-plano` → pagamento na secretaria | Checkout Stripe em `/escolher-plano` |
| Primeiro pagamento | Admin → Primeiro pagamento | Webhook `invoice.paid` |
| Seguro/matrícula LATE | `ensureOnboardingPendingPayments` | `skipTuition` opcional no onboarding Stripe; matrícula/seguro via admin |

Ver [`STRIPE_KINGDOM_ONLINE.md`](STRIPE_KINGDOM_ONLINE.md).

---

## 8. Migrações Supabase (junho 2026)

| Ficheiro | Conteúdo |
|----------|----------|
| `20260630120000_insurance_waiver_advance_payments.sql` | `InsuranceSettings`, `StudentWaiver`, `StudentInsuranceCoverage`, enum `PaymentType` |
| `20260630140000_enrollment_fee_payment_type.sql` | Enum `ENROLLMENT` |
| `20260630140100_enrollment_fee_columns.sql` | `enrollmentAmount`, `enrollmentFeeWaived`, índice matrícula |
| `20260630150000_payment_reference_month_nullable.sql` | `referenceMonth` nullable + check constraint |

**EU produção:** aplicadas (nomes remotos: `insurance_waiver_advance_payments`, `enrollment_fee_*`, `payment_reference_month_nullable`). Ver [`APLICAR_MIGRATIONS_SUPABASE.md`](APLICAR_MIGRATIONS_SUPABASE.md).

---

## 9. Ficheiros principais (código)

| Ficheiro | Responsabilidade |
|----------|------------------|
| `lib/ensure-onboarding-pending-payments.ts` | Criar LATE na atribuição de plano |
| `lib/first-payment-bundle.ts` | Confirmar primeiro pagamento (admin) |
| `lib/payment-tuition-upsert.ts` | Upsert mensalidade sem duplicar |
| `lib/student-onboarding-fees.ts` | Estado matrícula/seguro por aluno |
| `lib/renew-student-insurance-coverage.ts` | Renovar cobertura anual |
| `components/PlanSchoolPaymentModal.tsx` | Modal antes de escolher plano |
| `app/dashboard/financeiro/SchoolPaymentPendingModal.tsx` | Aviso pagamento pendente |
| `middleware.ts` | Gates waiver, plano, pagamento escola |
| `app/admin/alunos/insurance-actions.ts` | Registo seguro avulso por aluno |

---

## 10. Teste manual (checklist)

1. Configurar `annualAmount` e `enrollmentAmount` em Admin → Configurações.
2. Aluno novo: registo → waiver → `/escolher-plano` → confirmar modal → ver financeiro bloqueado.
3. Admin → Primeiro pagamento: seleccionar aluno, confirmar total (mensalidade + matrícula + seguro).
4. Aluno: refresh — acesso completo ao dashboard; seguro visível no perfil admin.
5. Check-in — permitido desde que o plano/mensalidade esteja em dia (o estado do seguro **não** bloqueia).

---

*Última atualização: junho 2026. Referência cruzada: [`memory.md`](memory.md), [`INDEX.md`](INDEX.md).*
