# Backlog — Validação e observabilidade

Pontos já corrigidos cujo efeito ainda tem de ser confirmado em produção, e coisas a vigiar.

## 1. Supabase — Cached Egress acima da quota (prazo 23/11/2026)

**Estado em 2026-11-11:** correção aplicada, falta confirmar o efeito.

- Plano Free: Cached Egress de **9,53 GB de 5 GB (191 %)** no ciclo de 15/10 a 15/11, com picos de cerca de 1 GB por dia. Período de tolerância até **23/11/2026**. Depois disso, os pedidos podem receber o código 402 (o projeto deixa de responder).
- **Causa:** as fotos da Tribo (cerca de 7 MB no total) eram servidas com cache de só 1 hora. Cada vez que um aluno abria o feed mais de uma hora depois, voltava a descarregar todas as fotos. Os registos de 24 h (10–11/11) só mostram uso normal (iPhone, Windows, Linux), sem robôs nem aparelhos em ciclo.
- **Correção:** em 24/10 (`b78abf4`), os novos uploads passaram a ser comprimidos e guardados com cache de 1 ano. Em 11/11 correu-se `scripts/storage/recomprimir-imagens.mjs --aplicar`, que pôs cache de 1 ano nas 40 imagens públicas antigas. Os originais estão em `scripts/storage/backup-2026-11-11/`.
- Todo o Storage tem cerca de 13 MB. O tamanho das imagens não é o problema; o problema era a cache.

**Validar:**
- [ ] **13 ou 14/11:** em Supabase → Usage → «Cached Egress per day», confirmar que a média baixou para menos de cerca de 160–200 MB por dia.
- [ ] **16/11 (início do novo ciclo):** confirmar que o total do ciclo cresce devagar, no ritmo de ficar abaixo de 5 GB em 30 dias.
- [ ] **Se não baixar:** passar para o Supabase Pro (25 $/mês) **antes de 23/11** e voltar a investigar. Pistas:
  - miniaturas: o cartão da Tribo na home mostra as fotos a 64×64 mas descarrega o ficheiro inteiro;
  - registos do API Gateway com o filtro `/storage/v1/object/public`, num dia de semana, durante o dia.

**Dica:** o painel de Logs mostra o projeto escolhido no topo. A organização «aquilainstitutegeral-maker» (`pwettlxz…`) é outro projeto, com uma quota separada.

## 2. Supabase — Log Ingestion (104 %)

- 1,04 GB de 1 GB. Segundo o painel, só começa a ser cobrado no início de 2027. Vigiar.
- Uma fonte possível: o `AuthSessionKeepAlive` chama `/auth/v1/user` a cada minuto e **aos pares** num iPhone. Ver se o componente está montado duas vezes.

## 3. Vercel Hobby — Fluid Active CPU

- Em 24/10 estourou: a página «/» era cerca de 60 % do CPU. Corrigido nesse dia ao mudar o `start_url` da app para `/dashboard` (`76b6053`).
- **2026-11-11 (últimos 30 dias): continua acima do limite.** Fluid Active CPU **6 h 7 min de 4 h (153 %)**. Invocações 261 mil de 1 M, Fast Data Transfer 16,3 GB de 100 GB, Fast Origin Transfer 3,9 GB de 10 GB, ISR Writes 10 mil de 200 mil. Só o CPU passa do limite.
- ✅ Observability, últimas 12 h (11/11): **«/» com 786 visitas e cerca de 2 min de CPU, à volta de 75 % do total.** Seguiam-se `/sign-in` (7 s), `/aula-experimental` (5 s) e `/admin/alunos/[id]` (4 s).
- ✅ **Correção (11/11, no `dev`):** o layout raiz deixou de ler cookies (o tema e a língua passaram a ser aplicados por um script no `<head>`). A home ficou estática (`force-static`, `revalidate = 3600`) e é renovada ao guardar planos, horários ou posts. A versão inglesa está em `/en`, com reescrita no middleware a partir do cookie `kfs-locale`.
- [ ] Depois do deploy: confirmar que «/» quase desaparece da lista de Functions e que o Fluid Active CPU baixa. Testar a troca de tema e de língua na home e o login Google (`/?code=`).
- [ ] Se mesmo assim não chegar: ver o separador Middleware (corre em quase todos os pedidos) e as páginas `force-dynamic`.
- [ ] Decidir: Vercel Pro (20 $/mês; o plano Hobby também não permite uso comercial) ou otimização / Cloudflare.
- [ ] Confirmar no painel da Vercel que o CPU ficou estável depois das alterações. Se não ficou: tornar a home estática (tirar a leitura de cookies do `app/layout.tsx`) ou retomar a migração para a Cloudflare (ver a memória e `DOCS/DEPLOY_CLOUDFLARE.md`).
