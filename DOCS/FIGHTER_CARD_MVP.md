# Fighter Card — MVP e alinhamento técnico

> **Estado:** código implementado (`dev`/`main`) — **falta aplicar a migração em produção** (`20260922120000_fighter_card_public.sql`) antes do toggle funcionar para alunos reais. Verificado visualmente (dados de exemplo) que o cartão renderiza correctamente via `next/og`; o caminho "indisponível" já funciona em produção mesmo sem a migração (degrada sem rebentar).
> **Última revisão:** 22 setembro 2026 — implementação completa a partir da especificação (ver §16, item 1, no [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md)).

Cartão de conquista partilhável, gerado automaticamente a partir dos dados reais do aluno (faixa, XP, presença, badges), pensado para ser publicado no Instagram Stories, WhatsApp ou onde o aluno quiser — e trazer alunos novos através dele.

---

## 1. Objetivo

- Dar a cada aluno uma **imagem bonita e honesta da sua evolução**, pronta a partilhar, sem trabalho manual (nada de screenshot da app).
- Cada partilha é publicidade da escola: a imagem inclui marca + CTA para aula experimental, e o link público usa o **mesmo mecanismo de indicação já existente** (`?ref=<studentId>` em `/aula-experimental`, ligado a `referredByStudentId` e `grantReferralRewardIfEligible`) — zero trabalho novo do lado da recompensa, só da geração/partilha da imagem.
- **Opt-in explícito.** Ninguém tem um cartão público por omissão.

---

## 2. O que aparece no cartão

Tudo já existe e já é calculado noutros pontos da app — o Fighter Card não introduz nenhuma métrica nova, só a compõe visualmente:

| Campo | Fonte |
|---|---|
| Nome | `User.name` |
| Foto (ou silhueta/inicial se não tiver) | `User.avatarUrl` |
| Faixa (cor + nome) | `Athlete.displayBeltIndex` → `getBeltName()` (`lib/belts.ts`) |
| Modalidade principal | `Student.primaryModality` → `MODALITY_LABELS` |
| XP total | `Athlete.xp` |
| Aulas totais | `BadgeStats.totalClasses` (`computeBadgeStats`, `lib/gamification.ts`) |
| Sequência (semanas seguidas) | `BadgeStats.consecutiveWeeks` |
| "Aluno(a) desde" | `Student.createdAt` (mês/ano) |
| Badges (até 4, mais recentes) | `StudentBadge` + `getBadgeDefinition()` |
| Marca + CTA | fixo: "Kingdom Fight School · Treina comigo" + `kingdomfight.com/aula-experimental` |

Fora de âmbito no MVP: pilares do radar (técnico/tático/físico/mental/teórico) — visualmente carregado a mais para um cartão; posição no rank — dados sensíveis/competitivos a mais para um primeiro release, ver §8.

---

## 3. Geração da imagem

**Motor único, servidor:** `next/og` (`ImageResponse`, já parte do Next 15 — sem dependência nova) numa rota dedicada, não num `<canvas>` no browser. Um único componente JSX serve três consumidores:

1. **Pré-visualização de link** (`opengraph-image.tsx` da página pública — convenção do Next) — quando alguém cola o link `/t/f/[studentId]` no WhatsApp/Telegram/Twitter sem usar a partilha nativa, a rede busca automaticamente esta imagem para o preview.
2. **Descarregar / partilhar** — o botão "Partilhar" no dashboard busca a mesma imagem (`fetch` → `blob`) e usa-a com `navigator.share({ files: [blob], url, text })`.
3. **Ficheiro para quem quiser guardar manualmente** (desktop, ou telemóveis sem `navigator.share` com ficheiros).

Formato: **1080×1920 (vertical, 9:16)** — o formato do Instagram Stories e do WhatsApp Status, que é para onde a maioria das partilhas vai. Não se cria um segundo template horizontal no MVP (as redes ainda mostram a vertical no preview do link, só com letterboxing — aceitável).

`export const revalidate = 3600` na rota de imagem — recalcular a cada hora chega para dados de XP/faixa que não mudam ao segundo, e evita recalcular Satori a cada pedido.

---

## 4. Partilha — WhatsApp vs. Instagram Stories

Confirmando a pergunta que fizeste: dá para os dois, por caminhos diferentes.

- **WhatsApp:** link directo `https://wa.me/?text=...` (padrão já usado em `lib/whatsapp.ts`) — funciona em qualquer browser, sem apps.
- **Instagram Stories:** não existe link universal (a Meta não o disponibiliza para a web aberta). O caminho real é `navigator.share({ files: [imagemPng] })` — a **Web Share API nível 2**, já usada em modo só-texto em `ReferralInviteSection.tsx`. No telemóvel, isto abre a folha de partilha nativa do sistema, onde o Instagram (Stories incluído) aparece como opção — é assim que Spotify Wrapped, Strava, etc. fazem.
- **Plano B** (desktop, ou browsers sem suporte a partilha de ficheiros): botão "Descarregar imagem" + o link do WhatsApp lado a lado.

---

## 5. Privacidade e consentimento

- **Opt-in explícito**, nunca automático. Toggle em `/dashboard/perfil` ("Tornar o meu Fighter Card público"), **desligado por omissão**.
- **Excluído de raiz para faixa etária KIDS** (`StudentProfile.dateOfBirth` → 0–12 anos, mesmo critério já usado no filtro de rank) — o toggle nem aparece; se quiserem isto para Kids no futuro, é fluxo à parte com consentimento do encarregado de educação, fora deste MVP.
- **Só alunos `ATIVO`** — se o aluno sair da escola (`INATIVO`), a página pública passa a devolver "cartão não disponível" mesmo que o toggle tenha ficado ligado (evita a escola continuar a "vender" ex-alunos).
- URL usa o `Student.id` (cuid, não sequencial — já é o padrão usado em `/t/p/[postId]` para posts da Tribo). Sem o toggle activo, a página não distingue "ID válido mas privado" de "ID inválido" — mesma resposta genérica, para não permitir enumerar quem tem conta.

---

## 6. Rotas

- **Página pública:** `/t/f/[studentId]` — o prefixo `/t/` já está na lista de rotas públicas do `middleware.ts` (`isPublicBrowserPath`), por isso **esta rota fica pública sem tocar no middleware**, mesmo padrão que `/t/p/[postId]`. Mostra o cartão grande + botão primário "Quero experimentar" → `/aula-experimental?ref=<studentId>` + link secundário para a home.
- **Imagem:** `/t/f/[studentId]/opengraph-image.tsx` (convenção Next, resolve pontos 3.1 e 3.2 automaticamente) + endpoint simples equivalente para o `fetch` do botão de partilha, se a convenção do Next não for reutilizável directamente nesse contexto (confirmar em implementação).
- **Botão "Partilhar o meu Fighter Card"** em `/dashboard/perfil` (ao lado do `ReferralInviteSection` já existente) e em `/dashboard/performance` (onde já se vê a faixa/radar — local natural para o gerar depois de uma conquista).

---

## 7. Modelo de dados (BD)

Uma única coluna nova — sem tabela nova, sem cache de imagem:

```sql
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "fighterCardPublic" boolean NOT NULL DEFAULT false;
```

Tudo o resto (§2) já existe e é lido em tempo real, tal como as outras páginas que já mostram estes dados.

---

## 8. Fora de âmbito do MVP

- Retrospetiva semestral ("Wrapped") — usa o mesmo motor de imagem (`next/og`), mas é conteúdo e gatilho diferentes; item próprio no backlog (§16.8 do roadmap).
- Posição no rank / comparação com outros alunos no cartão.
- Template horizontal dedicado para pré-visualização de link (usa-se a vertical com letterboxing).
- Fighter Card para Kids (precisa de fluxo de consentimento parental).
- Personalização do layout/cores pelo aluno.

---

## 9. Critérios de aceite (release MVP)

1. Aluno `ATIVO`, não-Kids, liga o toggle em `/dashboard/perfil` → o link público passa a funcionar.
2. Aluno desliga o toggle → `/t/f/[studentId]` deixa de mostrar dados (resposta genérica).
3. Botão "Partilhar" num telemóvel com Instagram instalado → Instagram Stories aparece na folha de partilha nativa.
4. Link colado no WhatsApp (sem usar o botão de partilha) → preview mostra a imagem do cartão (via `opengraph-image`).
5. Alguém entra em `/aula-experimental?ref=<studentId>` a partir do link do cartão e reserva → conta como indicação (mesma lógica já existente, sem alterações).
6. Aluno `INATIVO` com toggle ligado → página pública mostra "não disponível", não os dados antigos.
7. Faixa etária KIDS → toggle não aparece.

---

## 10. Referências cruzadas

- Roadmap: [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) §16 (backlog de crescimento)
- Padrão de página pública reaproveitado: [`TRIBO_MVP.md`](TRIBO_MVP.md) (`/t/p/[postId]`)
- Indicação/referral já existente: `lib/referral-rewards.ts`, `app/dashboard/perfil/ReferralInviteSection.tsx`, `app/aula-experimental/actions.ts`
- Faixas e XP: `lib/belts.ts`, `lib/gamification.ts`
