# Especificação Funcional: O Novo Fluxo de Cadastro e Onboarding de Alunos

## 1. Visão Geral e Objetivo

**Objetivo:** Implementar um novo fluxo de cadastro e onboarding "self-service" para novos alunos. A meta é reduzir o atrito inicial, permitindo que o utilizador crie uma conta e explore a plataforma num estado "Free Tier" (amostra grátis) antes de se comprometer com um plano. Esta abordagem visa aumentar a taxa de conversão ao demonstrar o valor do produto primeiro.

---

## 2. A Jornada do Novo Aluno (Passo a Passo)

Este é o percurso que um novo utilizador fará desde o registo até à ativação completa.

### **Passo 1: A Página de Cadastro Simplificada (`/sign-up`)**

*   **Objetivo:** Obter apenas o essencial para criar uma conta de utilizador, tornando o registo o mais rápido possível.
*   **Componentes da UI:**
    *   Input: "Nome Completo"
    *   Input: "Email"
    *   Input: "Senha" (com campo de confirmação)
    *   Botão de ação principal: `[ Criar Conta ]`
    *   Um separador visual (ex: "----------- OU -----------")
    *   **Botão de Destaque:** `[ Continuar com Google ]`. Este deve ser visualmente mais apelativo, pois é o caminho mais rápido.
*   **Lógica de Backend:**
    *   Após o cadastro bem-sucedido, o sistema cria as entidades `User`, `Student` e `StudentProfile`.
    *   O `StudentProfile` deve ter um campo `hasCompletedOnboarding` definido como `false`.
    *   O utilizador é imediatamente autenticado e redirecionado para a página `/onboarding`.

---

### **Passo 2: O Wizard de Onboarding (`/onboarding`)**

*   **Objetivo:** Coletar dados de perfil importantes de uma forma guiada e interativa, em vez de um formulário longo e intimidante.
*   **Lógica de Acesso:** Esta página só é acessível se `hasCompletedOnboarding` for `false`. Se um utilizador com onboarding completo tentar aceder, deve ser redirecionado para o `/dashboard`.
*   **Estrutura da UI:**
    *   Um layout limpo e centrado com um indicador de progresso (ex: "Passo 1 de 4").
*   **Ecrãs do Wizard:**
    *   **Ecrã 1: Boas-vindas**
        *   **Texto:** "Bem-vindo à Kingdom Fight School, [Nome]! Vamos preparar o seu perfil de guerreiro em poucos segundos."
        *   **Ação:** Botão `[ Começar ]`.
    *   **Ecrã 2: Dados Pessoais**
        *   **Inputs:** "Data de Nascimento", "Peso (kg)", "Altura (cm)".
        *   **Texto de Apoio:** "Estes dados ajudam-nos a acompanhar a sua evolução física."
        *   **Ação:** Botão `[ Próximo ]`.
    *   **Ecrã 3: Seus Objetivos**
        *   **Inputs:** Uma lista de checkboxes com opções como "Aprender Defesa Pessoal", "Competir", "Condicionamento Físico", "Aliviar o Stress".
        *   **Ação:** Botão `[ Próximo ]`.
    *   **Ecrã 4: Sua Escola** (Apenas se o sistema for multi-escola)
        *   **Input:** Um seletor (`select`) com a lista de escolas ativas.
        *   **Ação:** Botão `[ Finalizar Configuração ]`.
*   **Lógica de Backend:**
    *   Ao "Finalizar", os dados são guardados no `StudentProfile`, o campo `hasCompletedOnboarding` é atualizado para `true`.
    *   O utilizador é redirecionado para o `/dashboard`.

---

### **Passo 3: O Dashboard "Free Tier"**

*   **Objetivo:** Oferecer uma amostra funcional da plataforma para criar desejo e demonstrar valor, guiando o utilizador para a subscrição.
*   **Lógica de Renderização:** A página `/dashboard` verifica se `student.planId` é `null`. Se for, renderiza esta versão limitada.
*   **Componentes da UI:**
    *   **`ChoosePlanCTA` Banner:** Um banner no topo da página, que não pode ser fechado.
        *   **Texto:** "Seu perfil está pronto! Escolha um plano para desbloquear as aulas, a biblioteca e começar a treinar de verdade. 💪"
        *   **Ação:** Botão `[ ✨ Ver Planos e Preços ]` que leva para `/escolher-plano`.
    *   **Conteúdo Limitado (Demonstração):**
        *   **Agenda de Aulas:** A lista de aulas é visível, mas os botões de ação ("Vou", "Check-in") estão desativados. Um ícone de cadeado (🔒) com uma dica ("Assine um plano para participar") pode ser usado.
        *   **Biblioteca de Cursos:** A lista de cursos é visível. Ao clicar num curso, o utilizador vê a lista de aulas, mas o leitor de vídeo está bloqueado por uma sobreposição com a mensagem "Conteúdo exclusivo para assinantes" e um link para a página de planos.
        *   **Outras áreas:** O utilizador pode aceder ao seu perfil para editar os dados que inseriu no onboarding.

---

### **Passo 4: A Página de Escolha de Planos (`/escolher-plano`)**

*   **Objetivo:** Apresentar os planos de forma clara e convincente para facilitar a conversão.
*   **Estrutura:** Uma grelha de preços que compara os diferentes planos (`Plan`) lado a lado.
*   **Conteúdo por Plano:**
    *   Nome do Plano (ex: "Kingdom Presencial MMA").
    *   Preço por mês.
    *   Uma lista clara de benefícios e funcionalidades incluídas.
*   **Ação:** Um botão `[ Selecionar Plano ]` em cada opção, que inicia o fluxo de subscrição.

---

### **Passo 5: Ativação Completa**

*   **Lógica:** Após a seleção e pagamento (se aplicável) bem-sucedidos através do Stripe, o webhook do Stripe ou a sua lógica de subscrição atualiza o campo `student.planId`.
*   **Experiência do Utilizador:**
    *   O utilizador é redirecionado para o `/dashboard`.
    *   O `ChoosePlanCTA` banner desaparece.
    *   Todos os componentes (agenda, biblioteca, etc.) tornam-se totalmente funcionais. A jornada de onboarding está completa.

---

## 3. Requisitos Técnicos e Prompts para o Cursor

#### **Requisitos:**

1.  **Middleware (`middleware.ts`):** A lógica precisa ser ajustada para permitir que utilizadores autenticados com `student.planId === null` acedam a um conjunto específico de páginas (`/dashboard`, `/perfil`, `/escolher-plano`) enquanto bloqueia outras (`/check-in`).
2.  **Base de Dados (`schema.prisma`):** Adicionar o campo `hasCompletedOnboarding: Boolean @default(false)` ao modelo `StudentProfile`.
3.  **Rotas:** Criar as novas rotas `/onboarding` e `/escolher-plano`.
4.  **Componentes Condicionais:** Refatorar a página `/dashboard` e os componentes filhos para renderizar de forma diferente com base na existência de `student.planId`.

#### **Prompts Sugeridos:**

*   **Para o Wizard:**
    ```
    Crie uma nova página em `/onboarding`. Esta página deve ser um wizard multi-passo para novos utilizadores. Use a biblioteca 'zustand' para gerir o estado entre os passos. Os passos são: 1. Boas-vindas, 2. Dados Pessoais (nascimento, peso, altura), 3. Objetivos (checkboxes), 4. Escolha da Escola. Ao finalizar, os dados devem ser salvos e o utilizador redirecionado para o dashboard.
    ```
*   **Para o Dashboard Condicional:**
    ```
    Refatore a página em `app/dashboard/page.tsx`. Ela deve primeiro buscar os dados do aluno, incluindo o `planId`. Se `planId` for nulo, renderize um componente `ChoosePlanCTA` no topo da página e desative as funcionalidades interativas dos componentes filhos. Se `planId` existir, renderize o dashboard completo normalmente.
    ```
