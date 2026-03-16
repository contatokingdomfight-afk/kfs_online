# Stripe – Kingdom Online (Subscrições Recorrentes)

Configuração completa para subscrições recorrentes do plano digital Kingdom Online. Os alunos subscrevem uma vez e a cobrança é automática (mensal, trimestral, semestral ou anual).

## ⚠️ IMPORTANTE: Teste vs Produção

**O erro "No such price"** acontece quando os Price IDs na base de dados são do modo **Teste** mas a app usa chaves **Live** (produção), ou vice-versa. No Stripe, teste e produção têm produtos/preços separados.

| Modo | Chave | Price IDs |
|------|-------|-----------|
| **Teste** | `sk_test_...` | Criados em "Área restrita" |
| **Produção** | `sk_live_...` | Criados em modo Live |

**Para produção (kingdomfight.com):** Cria os produtos/preços em modo **Live** no Stripe e atualiza a BD (ver abaixo).

## ⚠️ MCP Stripe vs Vercel – Contas diferentes

O **MCP Stripe** (Cursor) e a **Vercel** podem usar **contas Stripe diferentes**:

- **MCP Stripe** – usa a conta onde fizeste login no Stripe (OAuth). Os preços que vês no MCP existem nesta conta.
- **Vercel** – usa `STRIPE_SECRET_KEY` das variáveis de ambiente. Se for de outra conta, os Price IDs da BD não existem lá.

**Solução:** Garante que `STRIPE_SECRET_KEY` na Vercel pertence à **mesma conta Stripe** onde os produtos/preços foram criados.

1. Abre o [Stripe Dashboard](https://dashboard.stripe.com) da conta onde os preços existem (a que o MCP usa).
2. Developers → API keys → copia a **Secret key** (`sk_test_...` ou `sk_live_...`).
3. Na Vercel: Project → Settings → Environment Variables → `STRIPE_SECRET_KEY` → cola essa chave e faz redeploy.

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

**Sem o webhook configurado**, o pagamento funciona mas a plataforma não atualiza:
- Plano atribuído continua "Sem plano"
- Últimos pagamentos vazios
- Menu lateral continua com "Escolher plano" em vez das opções completas (Biblioteca, etc.)

### Configuração

1. Acede ao [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Adicionar endpoint** → URL: `https://kingdomfight.com/api/stripe/webhook` (ou o teu domínio)
3. Eventos a selecionar:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
4. Copia o **Signing secret** (começa com `whsec_`)
5. Na Vercel: Project → Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET` → cola o valor
6. **Redeploy** do projeto para aplicar a variável

### Verificar se está a funcionar

No Stripe Dashboard → Webhooks → clica no teu endpoint → vê os eventos enviados. Se falharem (erro 4xx/5xx), verifica os logs na Vercel.

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
