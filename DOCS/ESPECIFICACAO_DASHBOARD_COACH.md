# Especificação Funcional: O Novo Centro de Comando do Coach

## 1. Visão Geral e Princípios

**Objetivo:** Redesenhar a página inicial do professor (`/coach`) para que funcione como um "centro de comando" eficiente, organizado em torno do seu fluxo de trabalho diário: preparar, executar e acompanhar as aulas.

**Princípios de Design:**
*   **Foco no Agora:** Dar destaque máximo à tarefa mais iminente (a aula atual ou a próxima).
*   **Planeamento Facilitado:** Agrupar as ferramentas de preparação para as próximas aulas num local de fácil acesso.
*   **Acompanhamento Rápido:** Criar um atalho direto para a função de mentoria e acompanhamento de atletas.

---

## 2. Estrutura e Componentes

A página `/coach` será reestruturada nas seguintes secções, por ordem de prioridade:

### **Secção 1: FOCO ATUAL ⚡**

**Objetivo:** Fornecer ao professor acesso imediato e contextual à sua tarefa mais urgente, eliminando a necessidade de navegar por menus.

*   **Componente:** `CurrentOrNextClassCard`
*   **Posição:** Topo absoluto da página, como o principal ponto de foco.
*   **Lógica de Exibição (Inteligente e Contextual):**
    *   **Cenário 1 (Aula a decorrer):** Se o horário atual estiver dentro do `startTime` e `endTime` de uma aula, o componente exibe os dados dessa aula sob o título **"EM AULA AGORA"**.
    *   **Cenário 2 (Próxima aula):** Se nenhuma aula estiver a decorrer, o componente mostra a *próxima aula agendada* para o dia, com o título **"SUA PRÓXIMA AULA"**.
    *   **Cenário 3 (Sem aulas):** Se não houver mais aulas para o professor no dia, exibe a mensagem: "Nenhuma aula a decorrer ou agendada para hoje. Bom descanso!".
*   **Conteúdo do Cartão:**
    *   Nome da Modalidade e Horário.
    *   **Sumário de Alunos:** Um resumo dinâmico e útil, como: "**15** com intenção de vir, **2** experimentais agendados".
*   **Ação Principal:**
    *   Um único botão, grande e destacado: **`[ 🚀 GERIR AULA AGORA ]`**.
    *   Este botão é um link que aponta sempre para a página de gestão da aula em foco: `/coach/aula?lessonId=[ID_DA_AULA]`.

---

### **Secção 2: PREPARAÇÃO E PLANEAMENTO 📋**

**Objetivo:** Agrupar todas as ferramentas que o professor precisa para se preparar para as aulas do dia e planear o conteúdo da semana.

*   **Estrutura:** Uma grelha (grid) de cartões de ação, que se adapta a 2 colunas em ecrãs maiores.
*   **Componentes:**
    1.  **Cartão `TodayScheduleCard`**
        *   **Título:** "Resto do Dia".
        *   **Conteúdo:** Uma lista compacta das aulas que ainda faltam no dia (ex: "18:00 Muay Thai", "19:00 Boxe"). Cada item da lista deve ser um link para a respetiva página de gestão.
        *   **Ação:** Link no final do cartão: `[ Ver agenda completa → ]` (leva para `/coach/agenda`).
    2.  **Cartão `WeekThemeCard`**
        *   **Título:** "Tema da Semana".
        *   **Conteúdo:** Mostra o tema curricular ativo para a principal modalidade do professor. Se nenhum estiver definido, exibe um lembrete.
        *   **Ação:** Botão `[ ✍️ Definir / Editar Tema ]` (leva para `/coach/tema-semana`).
    3.  **Cartão `TrialClassesCard`**
        *   **Título:** "Aulas Experimentais".
        *   **Conteúdo:** Apresenta uma lista clara dos próximos alunos experimentais e a sua aula agendada (ex: "João Silva (18:00 Muay Thai)").
        *   **Ação:** Link no final do cartão: `[ Gerir todos os experimentais → ]` (leva para a página de gestão de aulas experimentais).

---

### **Secção 3: ACOMPANHAMENTO DE ATLETAS 🎯**

**Objetivo:** Oferecer um ponto de acesso rápido e direto à funcionalidade de mentoria, que é um dos diferenciais da plataforma.

*   **Componente:** `MonitoredAthletesList`
*   **Estrutura:** Um único painel com uma lista e uma ferramenta de busca.
*   **Conteúdo:**
    *   **Título:** "Seus Atletas".
    *   **Busca:** Uma pequena barra de busca no topo para filtrar a lista de atletas por nome em tempo real.
    *   **Lista de Atletas:** Uma lista com scroll (rolagem) que mostra o nome de cada atleta mentorado. Recomenda-se exibir a cor ou o nome da faixa ao lado do nome para fácil identificação.
*   **Ação:**
    *   Clicar no nome de um atleta na lista leva o professor diretamente para a página de performance detalhada desse atleta: `/coach/alunos/[id]/performance`.

---

## 3. Outros Elementos da Interface

*   **Acesso à Área de Aluno:**
    *   **Condição:** Apenas visível se o professor também tiver um perfil de aluno associado (`coach.studentId` existe).
    *   **Posição:** Para evitar confusão de contexto, este link **não** deve estar no conteúdo do dashboard de coach. Deve ser um item persistente na navegação principal da aplicação (na barra lateral ou no menu do perfil do utilizador).
    *   **Texto:** "Minha Área de Aluno".
