# Backlog — Migração da Vercel para a Cloudflare Workers

Registado em 2026-11-11. **Estado:** avaliação feita e app publicada em teste; migração por terminar.

## Porquê

- Na Vercel Hobby, o **Fluid Active CPU** está em **6 h 7 min de 4 h (153 %)** nos últimos 30 dias. A Vercel pode pausar as funções a qualquer momento, e o plano Hobby não permite uso comercial.
- A Cloudflare Workers Paid custa **5 $/mês** e inclui 30 M de ms de CPU (cerca de 8 h por mês). O Vercel Pro custa 20 $/mês.
- Ver também `BACKLOG_Validacao_Observabilidade.md` (ponto 3).

## Onde está o trabalho

- Branch `exp/cloudflare-bundle-test` (último commit `15343a8`, 24/10), no worktree `../kfs_online-cf`. O guia está nesse worktree (`COMECE_AQUI.md` e `DOCS/DEPLOY_CLOUDFLARE.md` dentro da branch). **A branch está parada desde 24/10 e tem de ser atualizada com o `dev`**, que leva várias semanas de avanço.
- Adaptador `@opennextjs/cloudflare`. O tamanho comprimido ficou em 7,45 MiB, dentro do limite de 10 MiB do plano pago (o gratuito só aceita 3 MiB).
- Publicada em teste em `kfs-online.kfs-system.workers.dev`, com cache em KV (o R2 dava o erro 10042), na conta Cloudflare da Kingdom Fight.
- Para emagrecer a app: o Sentry do servidor foi desligado (`DEPLOY_TARGET=cloudflare`) e a fonte do Fighter Card passou a ser carregada por fetch.

## Plano

### 0. Ponte (já)
- [ ] Passar para o **Vercel Pro por um mês** (20 $), para tirar o risco de a plataforma parar durante a migração. Cancelar no passo 6.

### 1. Preparar
- [ ] Atualizar `exp/cloudflare-bundle-test` com o `dev` e voltar a medir o tamanho (`wrangler deploy --dry-run`, tem de ficar abaixo de 10 MiB gzip).
- [ ] Passar a conta Cloudflare para **Workers Paid (5 $/mês)**. No gratuito, o limite de 10 ms de CPU dá 503 em `/loja`, `/academy` e noutras páginas.
- [ ] Copiar para a Cloudflare as variáveis que hoje só existem na Vercel (VAPID, `NEXT_PUBLIC_SITE_URL`, Revolut, Stripe, Supabase, etc.). **Quem coloca as chaves é o administrador**; nunca passam pelo chat nem pelo repositório.

### 2. Corrigir
- [ ] Investigar e resolver os erros «ReadableStream locked».
- [ ] Rever o middleware e os cookies de sessão. Atenção à memória sobre os redirecionamentos que perdiam cookies (causa dos logouts que já tivemos).

### 3. Crons
- [ ] Passar os crons da Vercel para os **Cron Triggers** da Cloudflare (`cloudflare/worker.ts`; estão desligados em `wrangler.jsonc`).
- [ ] **Nunca deixar os crons ligados nos dois sítios ao mesmo tempo:** a base de dados é a mesma e as mensalidades e cobranças ficariam duplicadas. Desligar na Vercel e ligar na Cloudflare no mesmo momento (passo 5).
- [ ] Os jobs do `pg_cron` (Supabase) não mudam.

### 4. Testar no domínio de teste (com contas `@local.test` / tester)
- [ ] Login, logout, sessão longa e PWA no iPhone e no Android.
- [ ] Pagamentos Revolut: checkout da loja, mensalidades, adesão, pagamento automático (subscrições) e webhooks. Os webhooks apontam para o domínio de produção, por isso testar em Sandbox ou fazer um plano próprio para o webhook.
- [ ] Stripe (Academy, biblioteca) e respetivo webhook.
- [ ] Notificações push.
- [ ] Imagens de partilha (OG / Fighter Card), PDFs (certificado, contrato) e uploads (avatar, Tribo, comprovativos).
- [ ] Páginas públicas: `/`, `/loja`, `/academy`, `/aula-experimental`.

### 5. Mudar
- [ ] Escolher uma hora calma (à noite). Mudar o DNS de `kingdomfight.com` / `www` para a Cloudflare.
- [ ] Atualizar os webhooks (Revolut, Stripe) se o URL mudar, e o redirect da Revolut Business.
- [ ] Desligar os crons na Vercel e ligar na Cloudflare.
- [ ] Manter a Vercel publicada alguns dias como plano B (voltar atrás = repor o DNS).

### 6. Fechar
- [ ] Vigiar o CPU e os erros na Cloudflare durante 1 a 2 semanas.
- [ ] Cancelar o Vercel Pro e atualizar as memórias e os documentos de deploy.

## Riscos

- **Pagamentos em duplicado ou perdidos** (crons e webhooks): é o maior risco, por isso os passos 3 e 5 têm de ser feitos com cuidado.
- **Logouts** por diferenças no tratamento dos cookies.
- **Incompatibilidades do OpenNext** com funcionalidades do Next.js (ISR, `next/og`, imagens).
