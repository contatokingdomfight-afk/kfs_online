# Revisão de segurança – KFS (resumo)

Resumo da revisão feita no projeto em termos de segurança. **Não substitui uma auditoria externa.**

---

## ✅ Pontos positivos

### 1. Variáveis de ambiente
- O ficheiro **`.env`** está no **`.gitignore`** e **não está versionado** no repositório.
- Chaves sensíveis (Stripe, Resend, Supabase service_role, CRON_SECRET) são lidas de `process.env` apenas no servidor.
- Existe **`.env.example`** sem valores reais, para referência.

### 2. Autenticação e autorização na aplicação
- **Middleware** redireciona utilizadores não autenticados para `/sign-in` em rotas protegidas.
- **Layouts** garantem acesso por papel:
  - `/admin` → só `ADMIN`
  - `/coach` → `COACH` ou `ADMIN`
  - `/dashboard` → aluno (ou admin “a ver como aluno”).
- **Server Actions** sensíveis validam o utilizador antes de alterar dados:
  - Admin (ex.: coaches, alunos, turmas): usam `getCurrentDbUser()` e verificam `role === "ADMIN"`; operações com **createAdminClient()** (service_role).
  - Coach (ex.: cursos): usam `getAuthorizedCoachStudent()` (COACH/ADMIN + permissão para criar cursos).
  - Aluno (ex.: presenças, perfil, biblioteca): usam `getCurrentStudentId()` e só atuam sobre o próprio aluno.

### 3. Acesso a recursos (IDOR)
- Página de curso `/dashboard/biblioteca/[id]` verifica **hasAccess** (plano digital ou compra) antes de mostrar conteúdo; sem acesso mostra “courseNoAccess”.

### 4. APIs e webhooks
- **Stripe webhook**: assinatura verificada com `STRIPE_WEBHOOK_SECRET`; sem assinatura válida devolve 400. **Idempotência** (jun. 2026): tabela `StripeWebhookEvent` + `Payment.stripeInvoiceId` único evitam pagamentos duplicados em `invoice.paid`.
- **Rotas de cron** (mensalidades, lembretes): `lib/cron/authorize-cron.ts` — em produção exige `CRON_SECRET` definido; aceita `Authorization: Bearer <CRON_SECRET>` ou cabeçalho `x-vercel-cron: 1` da Vercel.

### 5. XSS
- Não foi encontrado uso de `dangerouslySetInnerHTML`, `innerHTML` ou `eval()` no código.

### 6. RLS no Supabase
- RLS está **ativado** nas tabelas públicas.
- **User** e **Student**: políticas restritas (cada utilizador só acede à própria linha).
- **Jun. 2026 — endurecimento:** migração `20260616120000_production_security_hardening` aplicada no projeto EU. Tabelas sensíveis (`Payment`, `Attendance`, avaliações, notificações, etc.) usam funções `kfs_*` e políticas por papel (aluno = próprios dados; coach/admin = `kfs_is_staff()`). Catálogo: leitura aberta, escrita só staff. Ver [`SUPABASE_RLS.md`](SUPABASE_RLS.md).
- **Webhook Stripe:** assinatura inválida ou pedido sem credenciais → **401** (não expor 500 em cenários de auth).
- A app não expõe o cliente Supabase no browser para operações arbitrárias; Server Actions e Server Components validam role/studentId. RLS actua como **defesa em profundidade** contra chamadas directas à API Supabase com JWT de aluno.

---

## ⚠️ Recomendações e riscos a considerar

### 1. Ficheiro `.env` local
- **Nunca** fazer commit do `.env` (já está no `.gitignore`).
- Se em algum momento o `.env` tiver sido commitado no passado, rodar no histórico:  
  `git log -p -- .env` e, se necessário, rodar `git filter-branch` ou BFG para remover e **rodar as chaves** (Stripe, Supabase, Resend, CRON).

### 2. RLS — tabelas sem política explícita
- A maioria das tabelas críticas foi endurecida em jun. 2026. Rever periodicamente novas tabelas (`TribePost`, `waitlist`, etc.) e garantir políticas ou uso exclusivo de service role. Tribo usa admin client nas server actions.

### 3. CRON_SECRET
- Garantir que em produção está definido **CRON_SECRET** forte e que as rotas de cron (**/api/cron/***) não são acessíveis sem esse header/segredo.
- Em produção, confirme que apenas a Vercel (ou o agendador que usar) chama essas rotas com o segredo correto.

### 4. Supabase – Leaked password protection
- No Supabase Dashboard → Authentication → definições de password, ativar **Leaked password protection** (HaveIBeenPwned) para reduzir uso de palavras-passe comprometidas (conforme já referido em `DOCS/SUPABASE_RLS.md`).

### 5. Scripts e ficheiros sensíveis
- **Scripts** em `/scripts` que usam `GITHUB_TOKEN` ou leem de `mcp.json`: manter esses ficheiros fora do deploy e não expor tokens. O `.env` não é commitado; garantir que nenhum script cola chaves no código.

### 6. Dependências
- Periodicamente executar `npm audit` (ou `yarn audit`) e corrigir vulnerabilidades críticas/altas nas dependências.

---

## Resumo

- **Segredos**: não estão no repositório; `.env` está ignorado.
- **Autenticação e autorização**: bem aplicadas nos layouts e nas Server Actions (admin, coach, aluno).
- **Acesso a dados**: verificação de acesso ao curso na biblioteca; ações do aluno limitadas ao próprio `studentId`.
- **Webhooks e cron**: protegidos por segredo/assinatura; webhook Stripe com idempotência.
- **RLS**: ativo; políticas por papel nas tabelas sensíveis (jun. 2026); User/Student restritos desde o início.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — junho 2026.*
