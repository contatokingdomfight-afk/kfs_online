# Próximos passos – KFS Online

Documento de **estado atual** e **prioridades**. Para histórico antigo (multi-escola, deploy inicial), ver commits no Git e **`SUMARIO_COMPLETO.md`** (marcado como legado).

## Estado atual (março 2026)

- **Repositório:** `kfs_online` no GitHub (ex.: `contatokingdomfight-afk/kfs_online`); pushes e CI alinhados com este nome.
- **Stack:** Next.js **15** (App Router), React 18, Node **20**, Supabase, Prisma, Stripe, Resend.
- **Segurança:** `npm audit` sem vulnerabilidades conhecidas na última revisão; após `npm install` corre `npm audit` e `npm run build`.
- **Mensalidades:** regras em **Europe/Lisbon** — atraso após **5.º dia útil**; prazo até **fim do dia 10**; suspensão automática via cron **`/api/cron/payment-suspension`**. Detalhe: **`DOCS/PAGAMENTOS_MENSALIDADES_CRON.md`**.
- **Roadmap:** **`DOCS/ROADMAP_Plataforma_KFS.md`**.

## Deploy e produção (checklist)

1. **Vercel** — projeto ligado ao repo; **Node 20**; variáveis em **`.env.example`** + `SUPABASE_SERVICE_ROLE_KEY`, Stripe, Resend.
2. **`CRON_SECRET`** — definido na Vercel; protege crons quando não é o scheduler da Vercel a chamar.
3. **`vercel.json`** — crons: lembretes de aulas + **payment-suspension** (geração de LATE + suspensão).
4. **Stripe** — webhook apontando para **`/api/stripe/webhook`** (não `/api/webhooks/stripe` salvo se alterares o código).
5. **Supabase** — aplicar migrações em `supabase/migrations/` (incl. comentários de colunas de pagamento, se ainda não aplicaste).

## Documentação principal

| Ficheiro | Uso |
|----------|-----|
| `README.md` | Setup local, stack, estrutura |
| `DOCS/ROADMAP_Plataforma_KFS.md` | Feito / por fazer (incl. aulas livres, Vitest, seed) |
| `DOCS/CONTAS_TESTE.md` | Contas de teste (`npm run seed:test-users`) e `npm test` |
| `DOCS/PAGAMENTOS_MENSALIDADES_CRON.md` | Mensalidades, crons, campos `Student` |
| `DOCS/FINANCEIRO_STRIPE_E_PRESENCIAL.md` | Stripe, faturação em Portugal |
| `INDICE_DOCUMENTACAO.md` | Índice da raiz |
| `INICIO_RAPIDO.md` / `VERCEL_DEPLOY.md` | Deploy (validar URLs e nomes de repo) |

## Sugestões de evolução (produto)

Ver secções **14–17** do roadmap: BJJ/MMA, biometria, Battle Pass, PWA/Capacitor, notificações push, etc.

## Comandos úteis

```bash
npm install
npm audit
npm run build
npm run dev
npm test
# opcional: contas Admin / Coach / Aluno em local — ver DOCS/CONTAS_TESTE.md
# npm run seed:test-users
```

---

*Última atualização: março de 2026.*
