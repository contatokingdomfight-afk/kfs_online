# Stripe – Kingdom Online (Subscrições Recorrentes)

Configuração completa para subscrições recorrentes do plano digital Kingdom Online. Os alunos subscrevem uma vez e a cobrança é automática (mensal, trimestral, semestral ou anual).

## ⚠️ IMPORTANTE: Teste vs Produção

**O erro "No such price"** acontece quando os Price IDs na base de dados são do modo **Teste** mas a app usa chaves **Live** (produção), ou vice-versa. No Stripe, teste e produção têm produtos/preços separados.

| Modo | Chave | Price IDs |
|------|-------|-----------|
| **Teste** | `sk_test_...` | Criados em "Área restrita" |
| **Produção** | `sk_live_...` | Criados em modo Live |

**Para produção (kingdomfight.com):** Cria os produtos/preços em modo **Live** no Stripe e atualiza a BD (ver abaixo).

## Modelos de subscrição

| Periodicidade | Preço |
|---------------|-------|
| Mensal | €20/mês |
| Trimestral (3 meses) | €55 |
| Semestral (6 meses) | €110 |
| Anual | €200 |

**Price IDs atuais na BD** (modo teste): `price_1TAFWfEnpsjluynENfLzoWWc` (mensal), etc. Em produção precisas dos Price IDs do modo Live.

## O que está configurado

- **Tabela PlanPrice** – múltiplas opções de preço por plano
- **Checkout** – Stripe Checkout em modo `subscription` (cobrança recorrente automática)
- **Webhook** – atualiza `Student.planId` e `stripeSubscriptionId`; regista `Payment` em cada ciclo
- **Portal** – alunos podem gerir cartão, ver faturas e cancelar em `/dashboard/financeiro`

## Webhook Stripe (obrigatório)

1. Acede ao [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Cria endpoint: `https://teu-dominio.vercel.app/api/stripe/webhook`
3. Eventos a selecionar:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
4. Copia o **Signing secret** → variável `STRIPE_WEBHOOK_SECRET` na Vercel

## Variáveis de ambiente

```
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Atualizar Price IDs para Produção

1. No [Stripe Dashboard](https://dashboard.stripe.com), muda para **modo Live** (canto superior direito).
2. Cria os produtos e preços recorrentes (Mensal €20, Trimestral €55, Semestral €110, Anual €200).
3. Copia os **Price IDs** (formato `price_xxx`) de cada preço.
4. Executa no Supabase (SQL Editor):

```sql
-- Substitui pelos teus Price IDs de PRODUÇÃO
UPDATE "PlanPrice" SET "stripePriceId" = 'price_TEUMENSAL' WHERE id = 'planprice-online-mensal';
UPDATE "PlanPrice" SET "stripePriceId" = 'price_TEUTRIMESTRAL' WHERE id = 'planprice-online-trimestral';
UPDATE "PlanPrice" SET "stripePriceId" = 'price_TEUSEMESTRAL' WHERE id = 'planprice-online-semestral';
UPDATE "PlanPrice" SET "stripePriceId" = 'price_TEUANUAL' WHERE id = 'planprice-online-anual';

UPDATE "Plan" SET "stripePriceId" = 'price_TEUMENSAL' WHERE id = 'plan-online';
```

5. Configura o webhook em modo Live com a URL de produção.
6. Garante que `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` na Vercel são das chaves **Live**.

## Fluxo do aluno

1. Escolher plano → seleciona periodicidade (mensal, trimestral, etc.)
2. Checkout Stripe → introduz cartão
3. Stripe cobra automaticamente em cada ciclo (sem o aluno fazer nada)
4. Webhook atualiza BD e regista pagamentos
5. Aluno pode gerir cartão/faturas em "Gerir assinatura"
