# Aplicar migrations no Supabase (KFS)

As migrations de seed (avaliação Muay Thai e Boxing) podem ser aplicadas de duas formas.

## Opção 1: Supabase Dashboard (SQL Editor)

1. Abre o projeto no [Supabase Dashboard](https://supabase.com/dashboard) (projeto KFS).
2. Vai a **SQL Editor**.
3. Executa **por ordem** o conteúdo de cada ficheiro (cola e Run):
   - `supabase/migrations/20260308000000_seed_muay_thai_evaluation_techniques.sql`
   - `supabase/migrations/20260309000000_seed_muay_thai_tactical_evaluation.sql`
   - `supabase/migrations/20260310000000_seed_boxing_tactical_evaluation.sql`
   - `supabase/migrations/20260311000000_seed_boxing_technical_evaluation.sql`
   - `supabase/migrations/20260312000000_seed_boxing_styles_evaluation.sql`
   - `supabase/migrations/20260313000000_seed_muay_thai_styles_evaluation.sql`

As migrations são idempotentes (usa `WHERE NOT EXISTS`), por isso podes executar mais do que uma vez sem duplicar dados.

## Opção 2: Supabase CLI

Se tiveres o projeto ligado ao Supabase:

```bash
supabase login
supabase link --project-ref iozxildpnugqxzqkxntq
supabase db push
```

Isto aplica todas as migrations pendentes da pasta `supabase/migrations/`.

## Opção 3: Script local + `DATABASE_URL`

Fluxo usado no projeto EU (ver também [`memory.md`](memory.md)):

```bash
node scripts/list-pending-supabase-migrations.mjs
node scripts/apply-pending-migrations-pg.mjs
```

- **`DATABASE_URL`:** usar a connection string do **pooler** (porta `6543`) se a ligação directa `:5432` der `ETIMEDOUT` (comum no Windows).
- **Alternativa:** MCP `user-supabase_kfs_eu` — `apply_migration` ou `execute_sql`.
- Após aplicar via script (sem MCP), actualizar `scripts/lib/supabase-eu-remote-migration-names.mjs` para o índice local coincidir com o histórico remoto (`list_migrations`).

**Última migração de segurança (jun. 2026):** `20260616120000_production_security_hardening` — aplicada no projeto EU; `list-pending` = 0.

## Depois de aplicar os SQLs: ver as alterações na app

A app guarda em cache as configurações de avaliação durante 5 minutos. Para **ver de imediato** os novos critérios (técnicas, táticas, estilos):

1. **Reinicia o servidor Next.js**  
   Para o `npm run dev` (ou `yarn dev`) e volta a iniciar. Na próxima vez que abrires «Avaliar aluno» ou a página de critérios no Admin, a app vai buscar os dados novos à base.

2. **Ou espera 5 minutos**  
   O cache expira ao fim de 5 min; depois disso, um refresh à página já usa a config nova.

Quando alterares critérios em **Admin → Critérios de avaliação**, o cache é invalidado automaticamente (revalidateTag).

---

## Ranking `/dashboard/rank` — duas funções RPC

A página de rank usa `get_leaderboard_filtered`; se não existir, a app tenta `get_leaderboard_my_school`. Se aparecer *Could not find the function …* no **schema cache**, esse projeto Supabase ainda não tem a(s) função(ões) — aplica os SQL abaixo.

**Produção (abril 2026):** as duas migrações foram aplicadas no projeto KFS (incl. via MCP `user-supabase_kfs_eu` / SQL Editor). **Outro** `project-ref` ou clone novo: repetir os passos aqui.

No **SQL Editor**, executa **sempre nesta ordem** (cola o conteúdo de cada ficheiro e Run):

1. `supabase/migrations/20260402120000_leaderboard_school_rpc.sql` — cria `get_leaderboard_my_school(p_limit)`.
2. `supabase/migrations/20260412120000_leaderboard_filtered_rpc.sql` — colunas opcionais (`Student.primaryModality`, `StudentProfile.dateOfBirth`) e cria `get_leaderboard_filtered(...)`.

Sem o passo (1), o fallback da app também falha. Depois de aplicar, recarrega `/dashboard/rank`.

---

## Nota sobre tipos

Foi adicionado `comp_id::text` nos blocos DO das migrations para compatibilidade com a coluna `"componentId"` da tabela `EvaluationCriterion` (tipo text no teu projeto). Se a coluna for uuid, podes remover o `::text` nas migrations locais e voltar a aplicá-las.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — junho 2026.*
