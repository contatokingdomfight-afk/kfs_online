# Tribo (comunidade) — MVP e alinhamento técnico

> **Estado:** planeado, **não implementado** (ver [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) — prioridade 1 no resumo executivo; secção 14 Kingdom Digital).  
> **Última revisão (documentação):** 19 maio 2026 — doc canónica para desenvolvimento da primeira versão da **Tribo**.

Este documento fecha a lacuna entre a linha de roadmap («feed social + BD + Storage + moderação») e decisões mínimas para **implementação** (âmbito, papéis, dados, RLS, fora de âmbito). A [Especificação Kingdom Digital](Especificacao_Plataforma_Kingdom_Digital.md) resume o produto; aqui ficam os **critérios de aceite** e **riscos** do MVP.

---

## 1. Objetivo do MVP

- Dar à **comunidade da mesma escola** um espaço simples para **publicar**, **reagir** e **comentar**, reforçando pertença sem competir com redes sociais abertas.
- **Isolamento por escola:** todo o conteúdo visível num feed está ligado a um `schoolId`; utilizadores só veem a Tribo da escola onde são alunos/staff dessa escola (regra alinhada a [`SISTEMA_MULTI_ESCOLA.md`](SISTEMA_MULTI_ESCOLA.md) e ao modelo `Student` / `CoachSchool`).

---

## 2. Papéis e permissões (comportamento)

| Papel | MVP |
|--------|-----|
| **Aluno** (`User.role === ALUNO` com `Student` activo na escola) | Ver feed da sua escola; criar publicação (texto + anexos conforme limites); editar/apagar **as próprias** publicações e comentários; curtir; comentar; denunciar (se existir fluxo mínimo). |
| **Coach** (ligado à escola via `CoachSchool` ou equivalente em produto) | Igual ao aluno **ou** só moderar/destacar — **decisão de produto:** por defeito no MVP, **mesmas capacidades de publicação que o aluno** na Tribo da escola onde treina; sem poderes especiais até haver UI de moderação coach. |
| **Administrador** (`User.role === ADMIN`) | Ver feed por escola (selector ou rota admin); **ocultar / apagar** qualquer publicação ou comentário na escola; rever fila de denúncias (se implementada); configurar toggles simples (ex. «Tribo activa nesta escola») se existir `School` settings. |
| **Treinador assistente (escola)** | Tratar como **aluno** na Tribo para publicar/interagir **se** fizer sentido de produto; **não** obrigar paridade com coach até definido; documentar em `memory.md` quando implementado. |

**Fora do MVP:** RBAC granular no admin para «só ver Tribo» (usar `ADMIN` global ou sub-perfis quando [`PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md`](PLANO_ACAO_PERMISSOES_ADMIN_RBAC.md) estiver alinhado a esta área).

---

## 3. Funcionalidades no âmbito do MVP

### 3.1 Feed

- Lista cronológica (mais recente primeiro), **paginada** (cursor ou offset com limite baixo).
- Cada **publicação** inclui: autor, texto (comprimento máximo definido), data, estado (`ACTIVE` / `HIDDEN` / `DELETED` soft), opcionalmente **anexos** (ver Storage).

### 3.2 Anexos (fotos / vídeo curto)

- **Fotos:** permitir uma ou várias imagens por publicação (limite de ficheiros e MB por política).
- **Vídeo:** MVP pode limitar a **um vídeo curto** por post (duração e MB máximos) para controlar custo Storage e transcoding; ou **só imagens** na v0 e vídeo na v0.1 — escolher na implementação e registar na migração / release notes.
- **Formatos:** validar MIME no servidor; rejeitar executáveis e tipos estranhos.

### 3.3 Interações

- **Curtidas:** um utilizador autenticado dá toggle «curtir» num post (e opcionalmente num comentário — **v0:** só em posts simplifica contagem).
- **Comentários:** thread plana (sem sub-comentários infinitos no MVP; no máximo **uma** profundidade de resposta se necessário para UX).
- **Partilhas:** no MVP interpretar como **«copiar link»** ou **«partilhar URL interna»** do post (deep link para `/dashboard/tribo?post=…` ou rota acordada). **Repost** / quote-tweet fica fora do MVP.

### 3.4 Moderação (mínimo viável)

- **Admin:** acções «ocultar» (deixa de aparecer no feed público; autor pode ver estado «removido pela equipa» conforme copy) e «apagar» (soft delete).
- **Denúncia (opcional v0):** botão «Reportar» cria registo `TribeReport` com motivo enum + texto curto; notificação in-app a admins (padrão semelhante a [`NOTIFICACOES_IN_APP_E_EVENTOS.md`](NOTIFICACOES_IN_APP_E_EVENTOS.md)) — se atrasar o lançamento, lançar sem denúncias e acrescentar na primeira iteração.

### 3.5 Notificações

- **Desejável no MVP:** notificar o autor quando alguém comenta no seu post (in-app, tabela `Notification` existente).
- **Nice-to-have:** notificar quando recebe curtida (pode gerar ruído; configurável mais tarde).

---

## 4. Modelo de dados (proposta — nomes indicativos)

Não existe ainda em `prisma/schema.prisma`; na implementação, alinhar nomes ao projeto e criar migração Supabase + Prisma.

| Entidade | Campos mínimos sugeridos |
|----------|-------------------------|
| `TribePost` | `id`, `schoolId`, `authorUserId`, `body` (text), `status`, `createdAt`, `updatedAt`, `hiddenAt`, `hiddenByUserId` (nullable) |
| `TribePostMedia` | `id`, `postId`, `storagePath`, `mimeType`, `width`, `height`, `sortOrder` |
| `TribeComment` | `id`, `postId`, `authorUserId`, `body`, `status`, `createdAt`, `parentCommentId` (nullable) |
| `TribeLike` | `id`, `postId`, `userId`, `createdAt` — **unique** (`postId`, `userId`) |
| `TribeReport` (opcional) | `id`, `postId` ou `commentId`, `reporterUserId`, `reason`, `note`, `createdAt`, `resolvedAt` |

Índices: `(schoolId, createdAt DESC)` para feed; FKs com `ON DELETE` coerente com soft delete.

---

## 5. Storage (Supabase)

- **Bucket dedicado** (ex. `tribe-media`) com prefixo por escola: `schoolId/postId/...` para listagens e políticas.
- **Políticas:** upload só por utilizadores com `Student.schoolId` ou staff da mesma escola do prefixo; leitura pública **não** recomendada — URLs assinadas ou proxy pela app conforme padrão já usado noutros uploads do projeto.
- **Limites:** tamanho máximo por ficheiro e por utilizador/dia (rate limit em server action) para mitigar abuso.

Referência geral de segurança: [`SUPABASE_RLS.md`](SUPABASE_RLS.md), [`REVISAO_SEGURANCA.md`](REVISAO_SEGURANCA.md).

---

## 6. RLS (princípios)

- **Leitura** de `TribePost` / comentários / likes: apenas linhas com `schoolId` igual à escola do utilizador (derivado de `Student` ou vínculo coach/admin com essa escola).
- **Insert:** `authorUserId` = `auth.uid()` e `schoolId` validado server-side contra a escola do aluno/staff (não confiar só no cliente).
- **Update/Delete:** autor nos próprios conteúdos; admin com política extra para `status` / moderação.
- **Service role:** apenas em jobs/admin explícitos, nunca exposto ao browser.

Detalhar políticas SQL no mesmo PR que as tabelas, com testes manuais ou notas em [`APLICAR_MIGRATIONS_SUPABASE.md`](APLICAR_MIGRATIONS_SUPABASE.md).

---

## 7. Rotas e UI (sugestão)

- **Aluno:** `/dashboard/tribo` (ou nome final i18n «Comunidade» / «Tribo») — feed + compositor + detalhe de post.
- **Admin:** `/admin/tribo` ou secção dentro da escola já existente — lista por escola + moderação.
- **Navegação:** entrada no menu do dashboard aluno e, se aplicável, atalho na home (não obrigatório no primeiro PR).

Mobile first, coerente com [`Telas do Sistema – Mobile First.md`](Telas%20do%20Sistema%20–%20Mobile%20First.md) quando houver wireframes.

---

## 8. Fora de âmbito do MVP (explícito)

- Mensagens directas (DM) e chats em tempo real.
- Stories / conteúdo efémero.
- Feed algorítmico (ranking, «para ti»).
- Hashtags, menções `@`, páginas de perfil social além do perfil já existente.
- Comunidade **entre** escolas ou feed global da marca.
- Moderador coach dedicado com filas separadas (pode vir depois).
- Integração XP/gamificação por post (avaliar impacto anti-spam antes).

---

## 9. Critérios de aceite (release MVP)

1. Utilizador A da escola X **não** vê publicações da escola Y (teste com dois `schoolId`).
2. Autor pode apagar o próprio post; comentários deixam de aparecer ou mostram estado coerente.
3. Admin pode ocultar post alheio; feed deixa de o listar para alunos.
4. Upload recusado fora do MIME/tamanho permitido; URL de media não expõe bucket sem controlo de acesso.
5. Curtidas não duplicam para o mesmo utilizador no mesmo post (constraint + UX idempotente).

---

## 10. Referências cruzadas

- Roadmap: [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md)  
- Especificação produto (resumo Tribo): [`Especificacao_Plataforma_Kingdom_Digital.md`](Especificacao_Plataforma_Kingdom_Digital.md)  
- Contexto técnico vivo após implementação: [`memory.md`](memory.md)  
- Índice: [`INDEX.md`](INDEX.md)
