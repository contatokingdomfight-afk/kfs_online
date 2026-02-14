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
    
- status → `ATIVO | INATIVO | EXPERIMENTAL`
    
- createdAt
    

---

## 🥊 Athlete

Extensão do aluno quando entra em acompanhamento esportivo.

**Relacionamentos**

- 1 Student → 0..1 Athlete
    

**Campos**

- id
    
- studentId
    
- level → `INICIANTE | INTERMEDIARIO | AVANCADO`
    
- mainCoachId
    
- createdAt
    

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

## 💶 Remuneração de coaches (futuro, configurável)

**Não faz parte do MVP.** A plataforma será preparada para que a remuneração dos professores seja **configurável no futuro** (valores e regras definidos pela administração), sem fórmula fixa no código.

**Dados já disponíveis para qualquer fórmula futura:**

- Por aula: `Lesson` (coachId, date, startTime, endTime) → duração, quantidade de aulas.
- Por presença: `Attendance` com `status = CONFIRMED` → número de alunos por aula.

Quando a funcionalidade for implementada, poderá existir uma entidade de **configuração de remuneração** (ex.: valor fixo por aula, valor por aluno, valor por hora, etc.), aplicada sobre estes dados. Ver doc **Remuneração de Coaches — Configurável (Futuro).md**.

---

# 🔗 RELACIONAMENTOS (Resumo Mental)

- User → Student / Coach
    
- Student → Athlete (opcional)
    
- Coach → Lesson
    
- Student ↔ Lesson (Attendance)
    
- Coach → Comment
    
- Comment → Athlete ou Lesson
    

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