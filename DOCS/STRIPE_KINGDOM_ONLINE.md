# Stripe – Kingdom Online (Subscrições Recorrentes)

Configuração completa para subscrições recorrentes do plano digital Kingdom Online. Os alunos subscrevem uma vez e a cobrança é automática (mensal, trimestral, semestral ou anual).

## Modelos de subscrição disponíveis

| Periodicidade | Preço | Stripe Price ID |
|---------------|-------|-----------------|
| Mensal | €20/mês | `price_1TAFWfEnpsjluynENfLzoWWc` |
| Trimestral (3 meses) | €55 | `price_1TAFWdEnpsjluynES4TuzsBI` |
| Semestral (6 meses) | €110 | `price_1TAFWdEnpsjluynEBSFr76E7` |
| Anual | €200 | `price_1TAFWdEnpsjluynEj1vmnKbl` |

> **Nota:** Em modo de teste, os Price IDs podem ser diferentes. Verifica no [Stripe Dashboard → Produtos](https://dashboard.stripe.com/products).

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

## Fluxo do aluno

1. Escolher plano → seleciona periodicidade (mensal, trimestral, etc.)
2. Checkout Stripe → introduz cartão
3. Stripe cobra automaticamente em cada ciclo (sem o aluno fazer nada)
4. Webhook atualiza BD e regista pagamentos
5. Aluno pode gerir cartão/faturas em "Gerir assinatura"
