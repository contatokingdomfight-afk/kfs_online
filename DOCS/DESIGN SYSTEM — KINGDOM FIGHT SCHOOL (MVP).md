# 🎨 DESIGN SYSTEM — KINGDOM FIGHT SCHOOL (MVP)

## ❌ O que NÃO fazer agora

Evitar:

- Figma gigante
    
- Tokens complexos
    
- Componentes infinitos
    
- “Tema bonito” sem uso real
    

Isso **mata velocidade** e não traz retorno no MVP.

---

## ✅ O que FAZER (Design System certo para este momento)

### 🎯 Objetivo do Design System

> Garantir **consistência, rapidez e clareza**, principalmente no uso **com suor, pressa e tatame**.

---

## 1️⃣ Fundamentos (obrigatórios, simples)

### 🎨 Cores (poucas e funcionais)

**Paleta base**

- Preto → fundo
    
- Branco → texto principal
    
- Cinza → secundário
    
- **Vermelho Kingdom** → ação principal (check-in, confirmar, salvar)
    

⚠️ Regra:

> Vermelho = ação importante  
> Nunca usar vermelho só por estética.

---

### 🅰️ Tipografia

- Fonte: **Inter**
    
    - Excelente legibilidade mobile
        
    - Ótima com Tailwind
        
- Hierarquia simples:
    
    - Título
        
    - Texto
        
    - Texto pequeno
        

Nada além disso no MVP.

---

### 📏 Espaçamento

- Base 4px / 8px
    
- Botões grandes
    
- Margens generosas
    
- Dedos grandes, luvas, pressa 😄
    

---

## 2️⃣ Componentes essenciais (lista fechada)

Vocês **só precisam desses componentes agora**:

### 🔘 Button

- Primary (vermelho)
    
- Secondary (cinza)
    
- Danger (ex: remover)
    

Estados:

- normal
    
- loading
    
- disabled
    

---

### 🧱 Card

Usado em:

- Aula
    
- Atleta
    
- Comentário
    
- Alerta
    

---

### 🧾 Input

- Texto
    
- Texto longo (comentários)
    
- Select (modalidade, visibilidade)
    

---

### 🧭 Header

- Título da tela
    
- Voltar
    

---

### 🔔 Badge / Status

- Presente
    
- Experimental
    
- Pendente
    

---

### ➕ Floating Action Button (FAB)

- Criar comentário
    
- Entrar na aula
    

---

## 3️⃣ Estados visuais (muito importante)

Todo componente precisa ter:

- ⏳ Loading
    
- ❌ Erro
    
- 📭 Vazio (“Sem aulas hoje”)
    

👉 Isso evita UX quebrada.

---

## 4️⃣ Componentes QUE NÃO precisam agora

- Sidebar complexa
    
- Tabelas grandes
    
- Gráficos elaborados
    
- Animações pesadas
    

---

## 5️⃣ Como implementar isso RAPIDAMENTE (com Cursor)

### Stack ideal (já alinhada com o que escolhemos)

- Tailwind CSS
    
- shadcn/ui
    

### Fluxo de trabalho recomendado

1. Criar pasta `/components/ui`
    
2. Criar:
    
    - Button
        
    - Card
        
    - Input
        
3. Usar esses componentes em TODAS as telas
    

👉 Cursor ajuda muito:

> “Create a reusable Button component with primary and secondary variants using Tailwind”

---

## 6️⃣ Design System ≠ Estética

O diferencial da Kingdom Fight School não é:

- gradiente bonito
    
- sombra moderna
    

É:

- clareza
    
- disciplina
    
- identidade
    
- consistência
    

Isso **já é Design System**.

---

## 🥊 Resumo direto

Sim, **vale muito a pena** fazer Design System agora, **mas no formato certo**:

✔️ Pequeno  
✔️ Funcional  
✔️ Mobile First  
✔️ Pensado para uso real

---

