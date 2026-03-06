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
- **Stripe webhook**: assinatura verificada com `STRIPE_WEBHOOK_SECRET`; sem assinatura válida devolve 400.
- **Rotas de cron** (mensalidades, lembretes): exigem `Authorization: Bearer <CRON_SECRET>` ou cabeçalho de cron da Vercel.

### 5. XSS
- Não foi encontrado uso de `dangerouslySetInnerHTML`, `innerHTML` ou `eval()` no código.

### 6. RLS no Supabase
- RLS está **ativado** nas tabelas públicas.
- **User** e **Student**: políticas restritas (cada utilizador só acede à própria linha).
- Demais tabelas: política genérica `USING (true)` para `authenticated`; o controlo fino (quem pode fazer o quê) é feito na **aplicação** (Server Actions + layouts). O cliente do frontend usa o Supabase **apenas no servidor** (Server Components e Server Actions), não expondo chamadas arbitrárias ao Supabase a partir do browser.

---

## ⚠️ Recomendações e riscos a considerar

### 1. Ficheiro `.env` local
- **Nunca** fazer commit do `.env` (já está no `.gitignore`).
- Se em algum momento o `.env` tiver sido commitado no passado, rodar no histórico:  
  `git log -p -- .env` e, se necessário, rodar `git filter-branch` ou BFG para remover e **rodar as chaves** (Stripe, Supabase, Resend, CRON).

### 2. RLS permissivo em várias tabelas
- Hoje, com a chave **anon** + JWT de um utilizador autenticado, as políticas `USING (true)` permitem, em teoria, leitura/escrita em muitas tabelas.
- **Mitigação atual**: a app não expõe o cliente Supabase no browser para essas operações; tudo passa por Server Actions e Server Components, que validam role/studentId.
- **Melhoria futura**: definir políticas RLS mais restritas por tabela (ex.: Attendance só onde `studentId` = aluno da sessão; Payment só leitura para o próprio; etc.) para “defesa em profundidade” caso alguém chame a API Supabase diretamente.

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
- **Webhooks e cron**: protegidos por segredo/assinatura.
- **RLS**: ativo; User/Student restritos; restante dependente da app, com margem para endurecer RLS no futuro.

Se quiseres, no próximo passo podemos:
- desenhar políticas RLS mais restritivas por tabela, ou
- rever uma lista concreta de Server Actions (admin/coach) para garantir que todas checam role/identidade.
