# Níveis de indicação — especificação (backlog #2)

> **Estado:** especificação, por implementar.
> **Última revisão:** 25 setembro 2026.

Hoje o sistema de indicação (`lib/referral-rewards.ts`, `ReferralInviteSection.tsx`) só dá uma recompensa fixa (100 XP + crédito) por amigo convertido, e mostra dois números simples ("X indicações · Y tornaram-se aluno"). Esta spec define o que falta para "subir o nível da indicação": níveis de indicador, badge ao 3.º amigo convertido, e leaderboard de quem mais trouxe gente — reaproveitando ao máximo o que já existe.

---

## 1. Objetivo

- Dar aos alunos que mais trazem amigos **reconhecimento visível e progressivo**, para reforçar o hábito de partilhar (o link já existe, falta o incentivo social).
- Continuar a **não inventar dados novos**: tudo deriva de `Student.referredByStudentId` + `Student.referralRewardGrantedAt`, já gravados hoje sempre que uma indicação converte.
- Reaproveitar infraestrutura já existente: o sistema de badges (`lib/achievements.ts` + `StudentBadge`), o gatilho já correto (`grantReferralRewardIfEligible`), e o componente já existente (`ReferralInviteSection.tsx`).

---

## 2. Níveis do indicador

Baseados no `convertedCount` do aluno (número de indicados com `referralRewardGrantedAt` preenchido) — o mesmo valor já calculado em `app/dashboard/perfil/page.tsx`.

| Nível | A partir de | Nome (proposta, ajustável) |
|---|---|---|
| 0 | 0 convertidos | — (sem nível, estado atual) |
| 1 | 1 convertido | Aliado |
| 2 | 3 convertidos | Recrutador *(+ badge, ver §3)* |
| 3 | 5 convertidos | Capitão |
| 4 | 10 convertidos | General |

Os nomes e limiares acima são só uma proposta no espírito "Kingdom" — a decidir contigo antes de implementar. A recompensa (XP/crédito) continua **flat por indicação** como já é hoje; os níveis não têm de dar recompensa extra própria a não ser o badge do nível 2 — mas dá para adicionar um bónus de XP a cada subida de nível se preferires.

---

## 3. Badge ao 3.º amigo convertido

Reaproveita o sistema já existente em `lib/achievements.ts` (`ACHIEVEMENTS`, `AchievementConditionType`, `StudentBadge`) — o mesmo que já mostra badges como "Faixa Verde" ou "Atleta Consistente".

- Novo `AchievementConditionType`: `"referrals_converted"`.
- Nova entrada em `ACHIEVEMENTS`, ex.: `{ id: "recrutador", name: "Recrutador", description: "3 amigos indicados tornaram-se alunos", icon: "🤝", condition: "referrals_converted", conditionParam: 3, xpReward: 100 }`.
- `AchievementUnlockContext` ganha um novo campo `convertedReferralsCount`, alimentado pelo mesmo cálculo do `ReferralInviteSection` (ver §5).

---

## 4. Leaderboard "quem mais trouxe gente"

- Nova consulta agregando `Student` por `referredByStudentId`, contando só linhas com `referralRewardGrantedAt IS NOT NULL`, ordenada desc, **por escola** (mesmo âmbito usado nos rankings existentes — `lib/rank-filters.ts`).
- Top 5–10, mostrando nome + avatar + `convertedCount` (sem valores monetários — é sobre quem trouxe mais gente, não sobre quem ganhou mais crédito).
- Widget pequeno junto ao `ReferralInviteSection` em `/dashboard/perfil`, ou secção própria — a decidir no desenho de UI.

---

## 5. Refactor de suporte (antes de tudo)

Hoje o cálculo de `invitedCount`/`convertedCount` está só em `app/dashboard/perfil/page.tsx` (linhas 67-71). Para reutilizar em 3 sítios (perfil, badges, leaderboard) sem duplicar lógica, extrair para `lib/referral-stats.ts`:

```ts
export async function getReferralStats(supabase, studentId): Promise<{ invitedCount: number; convertedCount: number }>
```

`app/dashboard/perfil/page.tsx` passa a chamar esta função; `getAchievementUnlockContext` (`lib/achievements.ts`) passa a incluir a mesma chamada.

---

## 6. Gatilho de subida de nível / badge

`grantReferralRewardIfEligible` (`lib/referral-rewards.ts`) já corre exatamente no momento certo (1.ª vez que o pagamento do indicado fica `PAID`). Depois de conceder XP/crédito, passa a:

1. Recalcular `convertedCount` do indicador (via `getReferralStats`).
2. Se cruzou o limiar de um nível com badge (ex.: chegou a 3), inserir `StudentBadge` + notificação in-app própria (ex.: "Subiste de nível: Recrutador 🤝 — 3 amigos já treinam contigo!"), reaproveitando `createInAppNotification` já usado na mesma função.

Sem tabela nova: `StudentBadge` já existe; os níveis "sem badge" (1, 3ª entrada da tabela acima, etc.) são só um cálculo de UI a partir do `convertedCount`, não precisam de ser gravados.

---

## 7. Fora de âmbito

- Leaderboard entre escolas (só dentro da mesma escola, como os rankings existentes).
- Bónus monetário escalado por nível (fica flat, a não ser que decidas mudar).
- Decaimento de nível (nível nunca desce, mesmo que o indicado saia da escola depois).

---

## 8. Critérios de aceite

1. Aluno com 1 indicação convertida vê o nível "Aliado" (ou nome escolhido) em `/dashboard/perfil`.
2. Ao cruzar 3 indicações convertidas, recebe automaticamente o badge + notificação in-app, sem ação manual do admin.
3. Leaderboard mostra os alunos da mesma escola ordenados por `convertedCount`, sem expor dados de outras escolas.
4. Nenhuma alteração ao valor da recompensa flat já existente (100 XP + crédito) — os níveis são só reconhecimento, não mudam o que já funciona.

---

## 9. Referências cruzadas

- Roadmap: [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) §16 (backlog de crescimento), item 2.
- Indicação já existente: `lib/referral-rewards.ts`, `app/dashboard/perfil/ReferralInviteSection.tsx`, `app/dashboard/perfil/page.tsx`.
- Badges: `lib/achievements.ts`, `StudentBadge`.
- Rankings existentes (âmbito por escola): `lib/rank-filters.ts`.
- Cartão partilhável (outro item do mesmo backlog de crescimento): [`FIGHTER_CARD_MVP.md`](FIGHTER_CARD_MVP.md).
