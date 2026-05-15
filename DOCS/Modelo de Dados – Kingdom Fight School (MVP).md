# 🧠 Modelo de Dados – Kingdom Fight School (MVP)

> Modelo pensado para **MVP real**, Mobile First, uso diário no treino e **perfeito para Prisma + Cursor**.

---

## 👤 User (base de autenticação)

Representa qualquer pessoa logada no sistema.

**Campos principais**

- id
    
- name
    
- email
    
- role → `ALUNO | COACH | ADMIN`
    
- createdAt
    

---

## 🥋 Student

Perfil do aluno (todos começam aqui).

**Relacionamentos**

- 1 User → 1 Student
    

**Campos**

- id
- userId
- schoolId → escola (multi-escola)
- status → `ATIVO | INATIVO | EXPERIMENTAL`
- planId → plano atual (opcional); pode ser colocado a `null` na suspensão por pagamento
- stripeSubscriptionId → subscrição Stripe (opcional)
- **Pagamento / suspensão (mensalidade):**
  - `paymentGraceEndsAt` — fim do **dia civil 10** em `Europe/Lisboa` para regularizar após atraso (instante em timestamptz)
  - `paymentGraceReferenceMonth` — `YYYY-MM` da mensalidade em causa
  - `paymentSuspendedAt` — quando o acesso foi suspenso por falta de pagamento
  - `suspendedPlanId` — plano antes da suspensão; reposto após PAID
- createdAt

Ver também **`DOCS/PAGAMENTOS_MENSALIDADES_CRON.md`**.

---

## 🥊 Athlete

Extensão do aluno quando entra em acompanhamento esportivo.

**Relacionamentos**

- 1 Student → 0..1 Athlete
- Athlete → AthleteMissionAward (XP por targets de dimensão já atribuídos)
- Athlete → AthleteMissionCompletion (missões de modelo já concluídas)

**Campos**

- id
- studentId
- level → `INICIANTE | INTERMEDIARIO | AVANCADO`
- **xp** (integer, default 0) – gamificação: XP acumulado por missões (dimensão + missões configuráveis)
- mainCoachId
- createdAt

---

## 🎯 Gamificação (faixas, XP, missões)

**Sistema de faixas (cores):** Branca → Branca/amarela → Amarela → … → Preta → Preta/Dourado → Dourado 1, 2, … N. Para subir de cor, o atleta acumula o dobro do XP da cor anterior (primeira subida: 1000 XP). Cálculo em `lib/belts.ts`.

**AthleteMissionAward** – Registo de XP já atribuído por “atingir target X” numa dimensão (ex.: Técnico ≥ 4), para não duplicar ao reavaliar. Campos: athleteId, dimensionCode, targetScore, xpAwarded, createdAt. Unique (athleteId, dimensionCode, targetScore).

**MissionTemplate** – Missões configuráveis no Admin: nome, descrição, modalidade (opcional = todas), faixa (beltIndex, opcional = qualquer), xpReward, sortOrder, isActive. O atleta vê apenas as que se aplicam à sua modalidade e faixa.

**AthleteMissionCompletion** – Missões de modelo já concluídas pelo atleta (evita dar XP duas vezes). Campos: athleteId, missionTemplateId, completedAt, xpAwarded. Unique (athleteId, missionTemplateId).

---

## 🧑‍🏫 Coach

Perfil do treinador.

**Relacionamentos**

- 1 User → 1 Coach
    

**Campos**

- id
    
- userId
    
- specialties (Muay Thai, Boxing, etc)
    
- createdAt
    

---

## 🗓️ Lesson (Aula)

Representa uma aula presencial.

**Campos**

- id
    
- modality → `MUAY_THAI | BOXING | KICKBOXING`
    
- date
    
- startTime
    
- endTime
    
- coachId
    
- capacity
    
- planningNotes (o que será / foi passado)
    
- createdAt
    

---

## ✅ Attendance (Presença)

Check-in do aluno na aula.

**Relacionamentos**

- Student → Lesson
    

**Campos**

- id
    
- lessonId
    
- studentId
    
- status → `PENDING | CONFIRMED | ABSENT`
    
- isExperimental (boolean)
    
- createdAt
    

---

## 🧪 TrialClass (Aula Experimental)

Cadastro de aluno experimental.

**Campos**

- id
    
- name
    
- contact
    
- modality
    
- lessonDate
    
- convertedToStudent (boolean)
    
- createdAt
    

---

## 💬 Comment

Sistema central de acompanhamento.

**Pode ser usado para:**

- Perfil do atleta
    
- Aula específica
    

**Campos**

- id
    
- authorCoachId
    
- targetType → `ATHLETE | LESSON`
    
- targetId
    
- content
    
- visibility → `PRIVATE | SHARED`
    
- createdAt
    

---

## 💰 Payment (MVP simples)

Controle básico de mensalidade (alunos).

**Campos**

- id
    
- studentId
    
- amount
    
- status → `PAID | LATE`
    
- referenceMonth
    
- createdAt
    

---

## 🏥 StudentPhysicalAssessment (Avaliação física)

Ficha de anamnese e avaliação física inicial/renovação. Obrigatória a cada 6 meses; disponível para todos os coaches no perfil do aluno.

**Relacionamentos**

- Student → StudentPhysicalAssessment (várias avaliações ao longo do tempo)
- Coach → StudentPhysicalAssessment (instrutor que preencheu)

**Campos**

- id
- studentId
- coachId
- assessedAt (date) – data da avaliação
- nextDueAt (date) – data da próxima renovação (assessedAt + 6 meses)
- clearance → `APTO | APTO_RESTRICOES | NECESSITA_AVALIACAO_MEDICA`
- formData (jsonb) – resto da ficha (objetivos, histórico saúde, PAR-Q, atividade, sinais vitais, mobilidade, postura, testes físicos, avaliação instrutor 1–10, termo)
- createdAt

---

## 📋 Outras entidades (referência)

- **StudentProfile** – Dados do aluno: weightKg, heightCm, dateOfBirth, phone, medicalNotes, emergencyContact (usados na identificação da ficha de avaliação física).
- **GeneralDimension** – Componentes gerais de avaliação (Técnico, Tático, Físico, Mental, Teórico); Admin pode adicionar mais.
- **EvaluationComponent**, **EvaluationCriterion** – Critérios de avaliação por modalidade (Admin); usados no radar e no detalhe por componente.
- **ModalityEvaluationConfig** – Configuração por modalidade (categorias + critérios em JSON).
- **AthleteEvaluation** – Avaliação do atleta pelo coach na aula (scores dinâmicos ou legado gas/technique/strength/theory); alimenta o radar e o cálculo de XP por targets de dimensão.

---

## 💶 Remuneração de coaches (futuro, configurável)

**Não faz parte do MVP.** A plataforma será preparada para que a remuneração dos professores seja **configurável no futuro** (valores e regras definidos pela administração), sem fórmula fixa no código.

**Dados já disponíveis para qualquer fórmula futura:**

- Por aula: `Lesson` (coachId, date, startTime, endTime) → duração, quantidade de aulas.
- Por presença: `Attendance` com `status = CONFIRMED` → número de alunos por aula.

Quando a funcionalidade for implementada, poderá existir uma entidade de **configuração de remuneração** (ex.: valor fixo por aula, valor por aluno, valor por hora, etc.), aplicada sobre estes dados. Ver doc **Remuneração de Coaches — Configurável (Futuro).md**.

---

# 🔗 RELACIONAMENTOS (Resumo Mental)

- User → Student / Coach
- Student → Athlete (opcional); Student → StudentProfile; Student → StudentPhysicalAssessment
- Athlete → AthleteMissionAward, AthleteMissionCompletion
- Coach → Lesson; Coach → StudentPhysicalAssessment (avaliações que preencheu)
- Student ↔ Lesson (Attendance)
- Coach → Comment
- Comment → Athlete ou Lesson
- MissionTemplate → AthleteMissionCompletion
    
---

## Complemento (maio 2026) — eventos e notificações in-app

- Em produção (ver `prisma/schema.prisma`): **`Event`**, **`EventRegistration`** (ligação aluno–evento; estados como `PENDING` / `CONFIRMED`), **`Notification`** (destino por `studentId` **ou** `coachUserId` para staff). Fluxos de produto: **`DOCS/NOTIFICACOES_IN_APP_E_EVENTOS.md`**.

---

# 🧩 POR QUE ESSE MODELO FUNCIONA

- Simples para MVP
    
- Escala sem refatorar tudo
    
- Ótimo para Prisma
    
- Cursor entende facilmente
    
- Reflete a realidade do tatame
    

---

## 📌 Próximo passo lógico

1️⃣ Transformar isso em **schema.prisma**  
2️⃣ Criar **Server Actions base (CRUD)**  
3️⃣ Ligar modelo às telas (wireframes)

👉 Diga qual você quer fazer agora que eu sigo direto.

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026; maio 2026 — `NOTIFICACOES_IN_APP_E_EVENTOS.md`.*
