# Popular a tabela MissionTemplate no Supabase

A tabela **MissionTemplate** no Supabase começa vazia. As missões padrão existem no projeto nestes sítios:

| Onde | Ficheiro | Uso |
|------|----------|-----|
| Código | `app/admin/missoes/seed-missions-data.ts` | Botão "Importar missões padrão" na app |
| Documentação | `DOCS/MISSOES.md` | Lista em markdown |
| SQL | `supabase/migrations/20260226000000_seed_mission_template.sql` | Script para executar no Supabase |

---

## Opção 1: Executar o SQL no Supabase (recomendado)

1. Abre o **Supabase Dashboard** do teu projeto.
2. Vai a **SQL Editor**.
3. Abre o ficheiro `supabase/migrations/20260226000000_seed_mission_template.sql` no teu projeto e **copia todo o conteúdo**.
4. Cola no SQL Editor e clica **Run**.
5. Deves ver 69 linhas inseridas.

**Se der erro** do tipo "relation does not exist" ou "column does not exist":
- No Table Editor do Supabase, confirma o nome da tabela: pode ser `MissionTemplate` (com aspas) ou `mission_template` (minúsculas).
- Se for `mission_template` com colunas em snake_case (`belt_index`, `xp_reward`, etc.), avisa e podemos gerar uma versão do script para esse formato.

---

## Opção 2: Botão "Importar missões padrão" na app

Na página **Admin → Missões**, o botão **"Importar missões padrão"** insere as mesmas missões a partir de `seed-missions-data.ts`.

Para funcionar:

1. No `.env` tens de ter **SUPABASE_SERVICE_ROLE_KEY** (chave de serviço do projeto Supabase).
2. A tabela no Supabase tem de se chamar **MissionTemplate** e as colunas em camelCase (`beltIndex`, `xpReward`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`).

Se a tabela estiver vazia e o botão não der erro, as missões passam a aparecer na lista. Se não tiveres a service role key configurada, a importação falha e deves usar a **Opção 1**.

---

## Validar depois de popular

No SQL Editor do Supabase podes correr:

```sql
SELECT COUNT(*) FROM "MissionTemplate";
```

Ou, se a tabela for `mission_template`:

```sql
SELECT COUNT(*) FROM mission_template;
```

O resultado deve ser **69** (ou o número de linhas que importaste).
