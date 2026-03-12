# Plano de Ação: Sistema de Planos KFS

## Resumo das Regras por Plano

| Plano | Preço | Biblioteca/Cursos | Performance | Check-in | Check-ins/dia | Benefícios |
|-------|-------|-------------------|-------------|----------|---------------|------------|
| **Kingdom Online** | €20/mês | ✅ Total | ❌ Não | ❌ Não | 0 | — |
| **Kingdom Presencial I** | €50/mês | ❌ Não | ✅ Sim | ✅ Sim | 1 (uma modalidade) | — |
| **Kingdom Presencial MMA** | €80/mês | ✅ Sim | ✅ Sim | ✅ Sim | Ilimitado | — |
| **Kingdom FULL** | €100/mês | ✅ Sim | ✅ Sim | ✅ Sim | Ilimitado | ✅ Brindes e benefícios |

---

## Fase 1: Modelo de Dados (Base de Dados)

### 1.1 Migração SQL – Novos campos na tabela `Plan`

Adicionar colunas para controlar permissões por plano:

```sql
-- Novos campos
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_performance_tracking" boolean DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_check_in" boolean DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "max_check_ins_per_day" integer;  -- null = ilimitado, 1 = uma vez/dia, 0 = sem check-in
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "includes_exclusive_benefits" boolean DEFAULT false;
```

**Significado:**
- `includes_performance_tracking`: acesso à página de performance e métricas
- `includes_check_in`: acesso ao check-in de aulas presenciais
- `max_check_ins_per_day`: `0` = sem check-in, `1` = 1 por dia, `null` = ilimitado
- `includes_exclusive_benefits`: brindes e benefícios exclusivos (FULL)

### 1.2 Atualizar planos existentes (seed/migration)

Definir valores por tipo de plano (por nome ou por `modality_scope`):

- **Kingdom Online** (`modality_scope = NONE`):  
  `includes_performance_tracking = false`, `includes_check_in = false`, `max_check_ins_per_day = 0`
- **Kingdom Presencial I** (`modality_scope = SINGLE`):  
  `includes_performance_tracking = true`, `includes_check_in = true`, `max_check_ins_per_day = 1`, `price_monthly = 50`
- **Kingdom Presencial MMA** (`modality_scope = ALL`):  
  `includes_performance_tracking = true`, `includes_check_in = true`, `max_check_ins_per_day = null`
- **Kingdom FULL**:  
  `includes_performance_tracking = true`, `includes_check_in = true`, `max_check_ins_per_day = null`, `includes_exclusive_benefits = true`

---

## Fase 2: Admin – Formulário de Planos

### 2.1 `PlanForm.tsx` e `actions.ts`

- Adicionar campos ao formulário:
  - Checkbox: "Inclui acompanhamento de performance"
  - Checkbox: "Inclui check-in de aulas presenciais"
  - Select/Number: "Máximo de check-ins por dia" (0, 1, Ilimitado)
  - Checkbox: "Inclui brindes e benefícios exclusivos"
- Incluir estes campos em `createPlan` e `updatePlan`.

---

## Fase 3: Lógica de Negócio – Acesso por Plano

### 3.1 Função auxiliar `getPlanAccess(studentId)` ou similar

Criar em `lib/plan-access.ts` (ou equivalente):

- Recebe `studentId`
- Carrega `Student` + `Plan`
- Retorna objeto com:
  - `hasDigitalAccess`
  - `hasPerformanceTracking`
  - `hasCheckIn`
  - `maxCheckInsPerDay` (0 | 1 | null)
  - `hasExclusiveBenefits`
  - `allowedModalities` (já existe lógica no dashboard)

### 3.2 Dashboard (`app/dashboard/page.tsx`)

- **Kingdom Online** (`hasCheckIn = false`):
  - Ocultar secção de agenda (próxima aula, aulas da semana)
  - Ocultar botões "Vou" / "Não vou" e link de check-in
  - Mostrar apenas: biblioteca, loja, perfil, etc.
- **Planos com check-in**: manter comportamento atual (agenda, RSVP, check-in).

### 3.3 Página de Performance (`app/dashboard/performance/page.tsx`)

- Se `hasPerformanceTracking = false`:
  - Redirecionar para `/dashboard` ou mostrar mensagem: "O teu plano não inclui acompanhamento de performance. Atualiza para um plano presencial."
- Ocultar ou desativar link "Performance" no menu para estes planos.

### 3.4 Check-in (`app/dashboard/actions.ts` e `app/check-in/[lessonId]/page.tsx`)

**Bloquear acesso ao check-in para planos sem check-in:**

- Em `checkIn()` e `setAttendanceIntention()`:
  - Verificar `hasCheckIn`
  - Se `false`, retornar erro: "O teu plano não inclui check-in de aulas presenciais."

**Limitar check-ins por dia (Presencial I):**

- Em `checkIn()`:
  - Se `maxCheckInsPerDay === 1`:
    - Contar `Attendance` do aluno para o dia atual (`date` da `Lesson`) com `status = 'CONFIRMED'`
    - Se já existir 1, retornar erro: "Só podes fazer um check-in por dia no teu plano."
  - Verificar também se a aula pertence à modalidade do aluno (`primaryModality`) quando `modality_scope = SINGLE`.

### 3.5 Página de Check-in (`/check-in/[lessonId]`)

- Antes de permitir check-in:
  - Verificar `hasCheckIn`
  - Verificar `maxCheckInsPerDay` e modalidade (para Presencial I)
- Mostrar mensagem clara em caso de bloqueio.

### 3.6 Menu / Navegação

- Ocultar "Performance" e "Agenda" (ou equivalentes) quando o plano não incluir essas funcionalidades.
- Layouts: `app/dashboard/layout.tsx`, `app/sistema-pontuacao/layout.tsx`, etc. – usar `getPlanAccess` para decidir links visíveis.

---

## Fase 4: Conteúdo e UI

### 4.1 Home (`lib/home-content.ts` e `components/home/Plans.tsx`)

- Atualizar preço do **Kingdom Presencial I** para €50.
- Ajustar descrições para refletir:
  - Online: "Sem acompanhamento de performance nem check-in de aulas presenciais."
  - Presencial I: "Uma aula por dia, uma modalidade. Acompanhamento de performance e check-in incluídos."
  - Presencial MMA: "Check-ins ilimitados por dia."
  - FULL: "Brindes e benefícios exclusivos incluídos."

### 4.2 Secção de Benefícios Exclusivos (Kingdom FULL)

- Nova secção ou página para "Benefícios exclusivos" (lista de brindes, condições, etc.).
- Visível apenas quando `includes_exclusive_benefits = true`.
- Conteúdo pode ser estático ou gerido no Admin (ex.: tabela `PlanBenefit` ou texto em `Plan.description`).

---

## Fase 5: Stripe e Preços

### 5.1 Stripe

- Criar/atualizar Price no Stripe para Kingdom Presencial I (€50/mês).
- Atualizar `stripePriceId` no plano correspondente na base de dados.
- Garantir que `create-checkout-session` e webhook usam o `planId` correto.

---

## Fase 6: Testes e Validação

### 6.1 Cenários a testar

1. **Kingdom Online**:
   - Acesso à biblioteca e cursos ✅
   - Sem agenda, sem check-in, sem performance ✅
2. **Kingdom Presencial I**:
   - Agenda filtrada por `primaryModality` ✅
   - 1 check-in por dia ✅
   - Performance visível ✅
3. **Kingdom Presencial MMA**:
   - Check-ins ilimitados ✅
   - Todas as modalidades + digital ✅
4. **Kingdom FULL**:
   - Igual ao MMA + secção de benefícios ✅

---

## Ordem Sugerida de Implementação

1. **Migração** – novos campos em `Plan` e atualização dos planos existentes
2. **`lib/plan-access.ts`** – função central de permissões
3. **Admin PlanForm** – novos campos e actions
4. **Dashboard** – ocultar agenda/check-in para Online
5. **Performance** – bloquear para Online
6. **Check-in** – bloquear para Online e limitar a 1/dia para Presencial I
7. **Menu** – ocultar links conforme plano
8. **Home** – preços e textos
9. **Benefícios FULL** – secção ou página
10. **Stripe** – preço €50 e testes de pagamento

---

## Notas Técnicas

- **Identificação do plano**: usar `Plan.name` (ex.: "Kingdom Online") ou um campo `plan_type` (enum) para lógica mais estável.
- **Multi-escola**: os planos têm `schoolId`; garantir que a lógica de acesso respeita a escola do aluno.
- **Alunos sem plano**: tratar como sem acesso a performance e check-in (comportamento conservador).
