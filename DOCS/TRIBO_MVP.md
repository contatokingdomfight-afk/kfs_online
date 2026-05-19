# Tribo (comunidade) — MVP e alinhamento técnico

> **Estado:** em desenvolvimento / MVP (código + migrações).  
> **Última revisão (documentação):** 19 maio 2026 — alinhado a decisões de produto (media, curtir, partilha, âmbito, UX).

Este documento fecha a lacuna entre o roadmap e a **implementação**. A [Especificação Kingdom Digital](Especificacao_Plataforma_Kingdom_Digital.md) resume o produto; aqui ficam critérios de aceite, dados e UX.

---

## 1. Objetivo do MVP

- Dar à comunidade KFS um espaço para **publicar**, **reagir** e **comentar**, reforçando pertença.
- **Escola de origem** (`schoolId`): toda a publicação tem escola de origem (moderation, Storage, identidade).
- **Âmbito de visibilidade** (escolha no ato de publicar, ver §3.1):
  - **Só a minha escola** — apenas utilizadores cuja escola activa coincide com `schoolId` do post.
  - **Todas as escolas** — qualquer aluno autenticado com `Student` activo em **qualquer** escola vê no feed global da Tribo; continua a existir isolamento de dados por escola para conteúdo «só minha escola».

---

## 2. Papéis e permissões (comportamento)

| Papel | MVP |
|--------|-----|
| **Aluno** (`User.role === ALUNO` com `Student` activo) | Ver feed conforme §3.1; criar publicação com escolha de âmbito; editar/apagar **as próprias** publicações e comentários; curtir; comentar. |
| **Coach** | Mesmas capacidades **quando** existir área `/coach/tribo` ou equivalente; na primeira entrega a UI pode estar só em `/dashboard/tribo` (aluno). |
| **Administrador** | Moderação (ocultar / apagar); ver conteúdo por `schoolId` de origem. |
| **Treinador assistente** | Igual aluno na Tribo se aceder pelo dashboard e tiver plano/regras iguais aos restantes alunos. |

---

## 3. Funcionalidades no âmbito do MVP

### 3.1 Feed e visibilidade

- Lista **cronológica** (mais recente primeiro), **paginada**.
- Cada publicação: autor, texto, `schoolId` de origem, **`visibility`**: `SCHOOL_ONLY` | `ALL_SCHOOLS`, data, estado (`ACTIVE` / `HIDDEN` / `DELETED` soft), anexos de media.
- **Query de leitura:** o utilizador vê posts onde `status = ACTIVE` e (`visibility = ALL_SCHOOLS` **ou** (`visibility = SCHOOL_ONLY` e `schoolId` = escola do seu `Student` activo)).

### 3.2 Media (v1)

- **Inclui:** imagens estáticas **e GIF** (MIME `image/gif` tratado como animação; também JPEG, PNG, WebP).
- **Exclui (v1):** vídeo (sem ficheiros `video/*` no MVP). Vídeo fica para iteração posterior.

### 3.3 Interações — curtir (identidade visual)

- O controlo de «curtir» usa **ícone de luva de boxe** (em vez de coração genérico).
- Ao **curtir** uma publicação com foto/GIF, mostrar um **efeito breve de «soco»** por cima da media (overlay animado, respeitando `prefers-reduced-motion`: versão estática ou sem animação).

### 3.4 Comentários

- Thread **plana** (sem árvore profunda no MVP).

### 3.5 Partilha (redes externas + conversão)

- A publicação tem **URL pública** de convite (ex. `/t/p/[postId]`) para partilhar em redes sociais.
- Visitante **sem sessão**: a landing deve **orientar para criação de conta** (`/sign-up`) com `next` (URL codificada) a apontar de volta para o conteúdo (ex. `/dashboard/tribo?post=…` ou `/t/p/…` após login), para maximizar conversão.
- **Web Share API** no mobile quando disponível; fallback: copiar link e/ou abrir redes com `url` pré-preenchido onde aplicável.

### 3.6 Moderação (mínimo viável)

- **Admin:** ocultar / apagar (soft) publicações e comentários.

### 3.7 Notificações

- Notificar o autor (in-app) quando alguém **comentar** no seu post (tipo dedicado ou `GENERAL` com copy Tribo).

### 3.8 UX e UI (requisitos transversais)

- **Mobile first**, touch targets confortáveis, composição e leitura em ecrã pequeno.
- **Modais / overlays** de **carregamento** e **sucesso / erro** ao criar publicação, enviar comentário e acções lentas (padrão familiar: spinner, estado desactivado no botão, feedback explícito).
- **Transições suaves** (entrada de cartões, hover/focus em desktop) e animações **curtas** e não intrusivas; respeitar **reduced motion**.

---

## 4. Modelo de dados (implementação)

| Entidade | Campos principais |
|----------|-------------------|
| `TribePost` | `id`, `schoolId`, `authorUserId`, `body`, `visibility` (`SCHOOL_ONLY` \| `ALL_SCHOOLS`), `status`, `createdAt`, `updatedAt`, `hiddenAt`, `hiddenByUserId` |
| `TribePostMedia` | `id`, `postId`, `publicUrl`, `mimeType`, `sortOrder`, `createdAt` |
| `TribeComment` | `id`, `postId`, `authorUserId`, `body`, `status`, `createdAt` |
| `TribeLike` | `id`, `postId`, `userId`, `createdAt` — **unique** (`postId`, `userId`) |

Índices: `(schoolId, createdAt DESC)`; filtro global pode usar `(visibility, status, createdAt DESC)`.

---

## 5. Storage (Supabase)

- Bucket **`tribe-media`** (público leitura, escrita via API servidor com validação — alinhado a `event-banners`).
- Prefixo sugerido: `tribe/{schoolId}/{postId}/{uuid}.{ext}`.
- **Limites:** MIME só imagens+gif (§3.2); tamanho máximo por ficheiro definido no código (ex. 3 MB).

---

## 6. RLS e acesso à BD

- As tabelas `TribePost`, `TribePostMedia`, `TribeComment` e `TribeLike` têm **RLS activa** sem políticas para o role `authenticated` — o acesso directo com a chave anon do browser **não** consegue ler nem escrever; o código da app usa **`SUPABASE_SERVICE_ROLE_KEY`** (cliente admin) **só no servidor**, após validar sessão e regras de visibilidade em TypeScript (`lib/tribe/*`, `app/dashboard/tribo/actions.ts`).
- Isto evita duplicar políticas complexas no SQL na primeira entrega; endurecer com políticas `SELECT`/`INSERT` por JWT fica como evolução.
- **Acesso negado ao feed:** a página não redirecciona silenciosamente para o início; mostra mensagens (ex.: conta sem `schoolId`, config admin em falta) e i18n `tribeBlocked*` — ver `app/dashboard/tribo/page.tsx` e `getTribeStudentWriteContext`.

Detalhe SQL: migração `supabase/migrations/20260520140000_tribe_mvp.sql`; aplicar em produção: [`APLICAR_MIGRATIONS_SUPABASE.md`](APLICAR_MIGRATIONS_SUPABASE.md).

---

## 7. Rotas

- **Aluno (app):** `/dashboard/tribo` — feed, compositor, detalhe com `?post=`.
- **Partilha pública:** `/t/p/[postId]` — OG/meta, CTA registo, redirect se já autenticado.
- **Admin (fase seguinte):** `/admin/tribo` se necessário lista por escola.

---

## 8. Fora de âmbito do MVP actual

- Vídeo (`video/*`).
- DM, stories, feed algorítmico, hashtags, menções, repost estilo quote.
- Gamificação por post (XP).

---

## 9. Critérios de aceite (release MVP)

1. Post `SCHOOL_ONLY` da escola Y **não** aparece no feed do aluno da escola X.
2. Post `ALL_SCHOOLS` aparece para alunos de X e Y.
3. Curtir com luva + efeito de soco na media (com fallback reduced motion).
4. Partilha externa abre URL pública; visitante sem conta é guiado para **sign-up** com retorno ao conteúdo.
5. Apenas imagens + GIF aceites no upload; vídeo rejeitado.
6. Modais/estados de carregamento e gravação nas acções principais; layout mobile first.

---

## 10. Referências cruzadas

- Roadmap: [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md)  
- Especificação produto: [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md)  
- Contexto técnico: [`memory.md`](memory.md)  
- Índice: [`INDEX.md`](INDEX.md)
