# Loja presencial (admin)

Módulo de merchandising no ginásio: catálogo com variantes, stock por escola, movimentos de inventário e registo de vendas na secretaria.

## Acesso

- Rotas: `/admin/loja` (hub), `/admin/loja/produtos`, `/admin/loja/stock`, `/admin/loja/vendas`, `/admin/loja/vendas/novo` (mini-POS).
- Permissões: `admin:financeiro:read` / `admin:financeiro:write` (mesma matriz que o financeiro).
- **Sem** acesso coach nem aluno (`/dashboard/loja` continua placeholder).

## Modelo de dados

Migração: [`supabase/migrations/20260707120000_retail_inventory.sql`](../supabase/migrations/20260707120000_retail_inventory.sql)

| Tabela | Propósito |
|--------|-----------|
| `ProductSupplier` | Fornecedor |
| `Product` | Artigo base (SKU, categoria, preço) |
| `ProductVariant` | Variante (tamanho/cor, SKU único) |
| `InventoryBalance` | Stock actual por `variantId` + `schoolId` |
| `StockMovement` | `IN` / `OUT` / `ADJUST` |
| `RetailSale` / `RetailSaleLine` | Venda presencial |

Cada produto tem pelo menos uma variante (ex. «Único»). Stock é **por escola**.

## Código

- `lib/retail/` — catálogo (`catalog.ts`), inventário (`inventory.ts`), vendas (`sales.ts`).
- `app/admin/loja/` — UI e server actions.

### Venda (transacção)

`createRetailSale` em `lib/retail/sales.ts`:

1. Insere `RetailSale` + `RetailSaleLine`.
2. Para cada linha, `StockMovement OUT` e actualiza `InventoryBalance`.
3. Em falha de stock, reverte sale/lines.

## Integração financeira

- Vendas `COMPLETED` entram no breakdown de receitas como categoria **`MERCHANDISE`** (`lib/admin-revenue-breakdown.ts`).
- Relatório consolidado: `/admin/financeiro/relatorio` (`lib/admin-financial-report.ts`).
- O KPI «Saldo do mês» em `/admin/financeiro` usa receitas de todas as origens (breakdown + matrícula/seguro) menos despesas.

## Despesas

`FinancialExpense` ganhou coluna opcional `category` (`RENT`, `UTILITIES`, `SUPPLIES`, `MARKETING`, `OTHER`) na mesma migração. Edição de despesas no modal do financeiro.

## Futuro (fora do MVP)

- Loja self-service aluno, TPA/Stripe, facturação Vendus/Moloni, devoluções com reposição de stock.
