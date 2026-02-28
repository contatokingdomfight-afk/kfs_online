
---

# 🧱 STACK DE DESENVOLVIMENTO — KINGDOM FIGHT SCHOOL

## 🎯 Objetivos técnicos (não negociáveis)

- Mobile First (uso no tatame)
    
- Desenvolvimento rápido com IA (Cursor)
    
- Custo baixo / quase zero no início
    
- Escalável (sem refazer tudo)
    
- Web App (sem precisar App Store no MVP)
    

---

## 🖥️ FRONTEND

### ✅ Next.js (App Router) + TypeScript

**Por quê:**

- Ótima integração com Cursor
    
- Estrutura clara (app/ folder)
    
- SEO para escola online
    
- PWA fácil depois
    

**Uso no projeto:**

- Web App para alunos, coaches e admin
    
- Rotas protegidas por role
    

---

### 🎨 UI: Tailwind CSS + shadcn/ui

**Tailwind**

- Mobile First por natureza
    
- Extremamente produtivo com Cursor
    
- Design limpo, funcional
    

**shadcn/ui**

- Componentes prontos (botão, modal, tabs)
    
- Customizável (não engessa)
    
- Ótimo para sistemas internos
    

👉 Ideal para telas simples e rápidas (check-in, comentário).

---

## 🔐 AUTENTICAÇÃO

### ✅ Clerk (recomendado) ou NextAuth

**Clerk**

- Login por email / telefone
    
- Gestão de roles (Aluno / Coach / Admin)
    
- Muito rápido de integrar
    
- Plano free suficiente para MVP
    

👉 Menos código, menos dor de cabeça.

---

## 🧠 BACKEND / LÓGICA

### ✅ Backend no próprio Next.js (Server Actions)

**Por quê:**

- Menos infraestrutura
    
- Código perto da UI
    
- Cursor entende muito bem
    

Exemplos:

- Confirmar presença
    
- Criar comentário
    
- Registrar aula experimental
    

---

## 🗄️ BANCO DE DADOS

### ✅ PostgreSQL + Prisma ORM

**Por quê:**

- Estrutura relacional (perfeita para aulas, presença, comentários)
    
- Prisma é absurdamente bom com Cursor
    
- Migrações fáceis
    
- Tipagem automática
    

**Hospedagem:**

- Supabase ou Neon (free tier)
    

---

## 📸 QR CODE (Check-in)

### Abordagem simples e eficiente

- QR Code contém:
    
    - `lesson_id`
        
- Frontend:
    
    - Aluno escaneia → página da aula
        
- Backend:
    
    - Cria presença com status `PENDING`
        
- Coach confirma
    

👉 Sem hardware extra, sem complexidade.

---

## 💬 COMENTÁRIOS (core do diferencial)

### Modelo simples

- Comentário
    
    - autor (coach)
        
    - alvo (aula ou atleta)
        
    - visibilidade
        
    - timestamp
        

Cursor ajuda MUITO aqui:

> “Create Prisma schema for coach comments on athlete profile”

---

## 💰 PAGAMENTOS (MVP)

### Opção 1 – MVP REALISTA

- Status manual:
    
    - Pago
        
    - Atrasado
        
- Registro via admin
    

👉 Automatiza depois.

### Opção 2 – Stripe (fase 2)

- Assinaturas
    
- Online school
    

---

## 📦 HOSPEDAGEM

### ✅ Vercel

- Deploy automático
    
- Preview por branch
    
- Excelente com Next.js
    

Banco:

- Supabase / Neon
    

---

## 🧪 AULA EXPERIMENTAL

### Simples e poderoso

- Formulário → banco
    
- Agenda básica
    
- Aparece automaticamente para coach no dia
    

---

# 🤖 CURSOR — COMO USAR A SEU FAVOR

### Padrão de trabalho recomendado

- Criar schema no Prisma primeiro
    
- Pedir ao Cursor:
    
    > “Generate CRUD for Lesson, Attendance, Comment using Server Actions”
    
- Iterar telas pequenas:
    
    - Uma tela = um prompt
        

👉 Cursor vira praticamente um dev júnior rápido.

---

# 📌 STACK FINAL RECOMENDADA (FECHADA)

**Frontend**

- Next.js + TypeScript
    
- Tailwind CSS
    
- shadcn/ui
    

**Backend**

- Next.js Server Actions
    

**Auth**

- Clerk
    

**Database**

- PostgreSQL
    
- Prisma ORM
    
- Supabase / Neon
    

**Deploy**

- Vercel
    

---

## 🚀 Próximo passo prático (recomendo fortemente)

Agora, o passo mais inteligente é:

### 1️⃣ Definir o **modelo de dados (Prisma schema)**

ou

### 2️⃣ Criar a **estrutura base do projeto (pastas + roles)**

👉 Me diz qual você prefere que eu construa primeiro contigo, já **pensando em prompts para usar direto no Cursor**.