# Boletim dos pais (Kids) — especificação (backlog #5)

> **Estado:** especificação, por implementar.
> **Última revisão:** 26 setembro 2026.

Resumo periódico e automático da evolução do aluno Kids (presença, evolução física, conquistas), pensado para os pais lerem e partilharem — sem trabalho manual do coach/admin.

---

## 1. Objetivo

- Dar aos pais de alunos Kids **visibilidade regular e sem esforço** sobre o progresso do filho — hoje só veem isso se entrarem eles próprios na app (o que raramente acontece, a conta é do aluno).
- Reforçar a perceção de valor da escola (prova de progresso = razão para continuar a pagar) — motivo pelo qual saiu como item de "alta prioridade percebida" no brainstorm.
- Tudo a partir de **dados já existentes** — sem pedir nada novo ao coach/admin, só compor e enviar o que já se regista (presença, XP/faixa, badges, avaliação física).

---

## 2. Bloqueio a resolver primeiro: como chegar aos pais

**Não existe hoje um campo de email do encarregado de educação fiável.** `StudentWaiver.guardianName` só guarda o nome (capturado na assinatura do termo de responsabilidade), sem email. Para alunos Kids assinados presencialmente pelo admin (`/admin/alunos/[id]/contrato/assinar`), o `User.email` de login é muitas vezes **sintético** (placeholder, não o email real dos pais) até alguém executar a troca `changeStudentLoginEmail` — o que só acontece quando o próprio aluno passa a ter acesso próprio (ex. ganha idade e email Google), não é a norma para Kids pequenos.

**Decisão necessária antes de implementar:** de onde vem o email de envio? Duas opções, não mutuamente exclusivas:
1. **Novo campo `StudentProfile.guardianEmail`** — capturado no mesmo sítio onde hoje se pede `guardianName` (assinatura do waiver) ou editável em `/admin/alunos/[id]/editar`. Mais correto a prazo, mas exige migração + preencher retroativamente os alunos Kids já existentes (trabalho manual do admin, ou campanha de pedir aos pais).
2. **Reaproveitar `User.email`** só quando não for um email sintético — mais simples de arrancar, mas cobre menos alunos Kids no dia 1 (os que ainda têm email placeholder ficam de fora até o admin atualizar).

Proposta: opção 1, com o envio **desativado por defeito por aluno** até o campo estar preenchido (mesmo espírito do opt-in do Fighter Card) — evita mandar boletins para o email errado (o do próprio aluno pequeno, se por acaso tiver).

---

## 3. Conteúdo do boletim

Tudo já existe e já é calculado noutros pontos da app (mesmo princípio do Fighter Card — compor, não inventar métricas novas):

| Secção | Fonte |
|---|---|
| Presença no período (aulas, % assiduidade) | `Attendance` (`status`, `occurrenceDate`) |
| Faixa atual + progressão de XP no período | `Athlete.displayBeltIndex`/`xp`, comparado ao snapshot do início do período (`AthleteXpSnapshot`, já usado no rank) |
| Conquistas/badges novas no período | `StudentBadge` (`earnedAt` dentro do período) |
| Última avaliação física (estado, próxima data) | `StudentPhysicalAssessment` (`clearance`, `nextDueAt`) |
| Sequência de semanas seguidas | `computeBadgeStats` (`lib/gamification.ts`), já usado no Fighter Card |

Fora de âmbito no MVP: notas de avaliação técnica por critério (muito granular para os pais) — só o essencial de progresso, no espírito do boletim, não do dashboard de performance.

---

## 4. Cadência e envio

- **Mensal**, no espírito "boletim escolar" — reaproveita o padrão já existente do cron semanal financeiro (`app/api/cron/financial-weekly-alert/route.ts`, `authorizeCronRequest`, `lib/notifications/email.ts`), mas com frequência mensal e destinatário por aluno em vez de admin único.
- Novo cron `app/api/cron/monthly-parent-report/route.ts`: percorre alunos Kids `ATIVO` com `guardianEmail` preenchido e boletim ativado, compõe o resumo do mês anterior, envia por email (Resend, mesmo transporte já configurado).
- **Sem versão "on-demand"** no MVP (o admin não dispara manualmente) — pode ser acrescentado depois se fizer falta.

---

## 5. Modelo de dados

```sql
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "guardianEmail" text;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "parentReportEnabled" boolean NOT NULL DEFAULT false;
```

Sem tabela nova — tudo o resto (§3) já é lido em tempo real a partir das tabelas existentes, tal como o Fighter Card faz.

---

## 6. Rotas / UI

- **Captura do email**: campo novo em `/admin/alunos/[id]/editar` (`guardianEmail`) — só visível/aplicável para alunos Kids (mesmo critério de idade já usado no Fighter Card, `isFighterCardEligibleAge` invertido).
- **Opt-in**: toggle "Enviar boletim mensal aos pais" no mesmo formulário — o admin ativa por aluno depois de confirmar o email, não os próprios pais (diferente do Fighter Card, aqui não há login dos pais).
- **Sem página pública nova** — é só um email, não uma página `/t/...` (ao contrário do Fighter Card e do quiz do item 3).

---

## 7. Fora de âmbito

- Portal próprio dos pais (login separado) — fica só o email, sem nova área da app.
- Personalização do conteúdo por aluno/pai.
- Envio para alunos não-Kids (adultos veem o próprio progresso na app).
- Anexo em PDF — email HTML simples primeiro (mesmo padrão dos templates já usados em `lib/notifications/email.ts`).

---

## 8. Critérios de aceite

1. Aluno Kids com `guardianEmail` preenchido e boletim ativado recebe, no início do mês, um resumo do mês anterior (presença, XP/faixa, badges novas, avaliação física).
2. Aluno Kids sem `guardianEmail` preenchido não é incluído no envio (sem erro no cron, só ignorado).
3. Aluno não-Kids nunca é incluído, mesmo que os campos existam.
4. Desativar o toggle por aluno para o envio seguinte.

---

## 9. Referências cruzadas

- Roadmap: [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) §16 (backlog de crescimento), item 5.
- Cron/email já existente (padrão a reaproveitar): `app/api/cron/financial-weekly-alert/route.ts`, `lib/notifications/email.ts`.
- Kids / assinatura presencial / troca de email sintético: `app/admin/alunos/[id]/contrato/assinar`, `changeStudentLoginEmail`.
- Gamificação/rank (fonte dos dados de progresso): `lib/gamification.ts`, `AthleteXpSnapshot`.
- Outro item do mesmo backlog de crescimento: [`FIGHTER_CARD_MVP.md`](FIGHTER_CARD_MVP.md).
