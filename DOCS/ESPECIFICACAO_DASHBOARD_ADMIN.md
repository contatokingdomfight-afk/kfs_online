# Especificação Funcional: O Novo Painel de Controlo do Admin

## 1. Visão Geral e Princípios

**Objetivo:** Transformar a página inicial do administrador (`/admin`) num "Painel de Controlo" dinâmico e funcional. A nova interface deve permitir monitorar a saúde do negócio, identificar e agir sobre tarefas urgentes, e navegar facilmente para todas as áreas de gestão.

**Princípios de Design:**
*   **Monitoramento Rápido:** Apresentar os KPIs (indicadores de performance) mais importantes do negócio de forma clara e imediata.
*   **Foco na Ação:** Transformar o dashboard de um relatório passivo numa lista de tarefas prioritárias.
*   **Navegação Organizada:** Agrupar as dezenas de áreas de gestão de forma lógica e visual.

---

## 2. Estrutura e Componentes

A página `/admin` será reestruturada nas seguintes secções, por ordem de prioridade:

### **Secção 1: SAÚDE DO NEGÓCIO 📈**

**Objetivo:** Fornecer um resumo "olhável" dos indicadores vitais da escola em tempo real.

*   **Componente:** `BusinessHealthStats`
*   **Posição:** Topo da página.
*   **Estrutura:** Uma linha com 4 a 5 cartões de estatística, cada um contendo um número em destaque, um título e um ícone.
*   **Conteúdo dos Cartões:**
    1.  **"Receita Este Mês"**
        *   **Dados:** Soma de `Payment.amount` onde `status = 'PAID'` no mês corrente.
        *   **Interação:** Um clique no cartão leva para `/admin/financeiro`.
    2.  **"Alunos Ativos"**
        *   **Dados:** Contagem de `Student` com um `planId` ativo.
        *   **Interação:** Um clique no cartão leva para `/admin/alunos`.
    3.  **"Novos Alunos (Mês)"**
        *   **Dados:** Contagem de `Student` criados no mês corrente.
        *   **Interação:** Um clique no cartão leva para `/admin/alunos` (idealmente com um filtro de data aplicado).
    4.  **"Média de Presenças (diária)"**
        *   **Dados:** Média de presenças confirmadas por aula nos últimos 7 dias.
        *   **Interação:** Um clique no cartão leva para `/admin/presenca`.

---

### **Secção 2: AÇÕES IMEDIATAS 🔥**

**Objetivo:** Expor proativamente as tarefas operacionais que requerem a atenção imediata do administrador, transformando o dashboard numa ferramenta de produtividade.

*   **Componente:** `ActionItems`
*   **Estrutura:** Um componente de **Abas (Tabs)**, onde cada aba mostra um contador com o número de itens pendentes.
*   **Conteúdo das Abas:**
    *   **Aba 1: "Pagamentos Pendentes (X)"**
        *   **Conteúdo:** Uma lista de alunos com mensalidades em atraso (`Payment.status = 'LATE'`), mostrando nome e valor.
        *   **Ação por Item:** Um botão `[ Gerir Pagamento ]` ao lado de cada aluno, que leva para o formulário de registo de pagamento já pré-preenchido.
        *   **Estado Vazio:** "Nenhum pagamento pendente. Ótimo trabalho!".
    *   **Aba 2: "Aulas Experimentais (Y)"**
        *   **Conteúdo:** Lista os novos pedidos de aula experimental que aguardam confirmação.
        *   **Ação por Item:** Botões como `[ Confirmar ]` ou `[ Converter em Aluno ]`.
        *   **Estado Vazio:** "Nenhuma aula experimental a aguardar ação."
    *   **Aba 3: "Turmas com Baixa Adesão (Z)"**
        *   **Conteúdo:** Lista as aulas da próxima semana com uma previsão de presenças muito baixa (com base nas intenções "Vou" dos alunos).
        *   **Ação por Item:** Um link `[ Ver Turma ]` para a página de gestão da turma.
        *   **Estado Vazio:** "Todas as turmas têm boa previsão de adesão."

---

### **Secção 3: VISÃO GERAL 📊**

**Objetivo:** Apresentar gráficos de tendências para apoiar a tomada de decisão estratégica a médio e longo prazo.

*   **Componente:** `OverviewCharts`
*   **Estrutura:** Uma grelha com 2 ou 3 gráficos principais.
*   **Gráficos Sugeridos:**
    1.  **Gráfico "Crescimento de Alunos (6 meses)"**:
        *   **Tipo:** Linhas ou barras.
        *   **Dados:** Mostra a evolução do número de alunos ativos, e opcionalmente uma série para "Novos Alunos" vs. "Alunos Desativados" por mês.
    2.  **Gráfico "Receita Mensal (12 meses)"**:
        *   **Tipo:** Barras.
        *   **Dados:** Mostra o total de receita faturada a cada mês.
    3.  **Gráfico "Popularidade das Modalidades (30 dias)"**:
        *   **Tipo:** Donut ou Pie.
        *   **Dados:** Mostra a distribuição percentual de presenças por modalidade.

---

### **Secção 4: GESTÃO DA PLATAFORMA ⚙️**

**Objetivo:** Organizar a grande quantidade de links de gestão de uma forma visual, lógica e de rápido acesso.

*   **Componente:** `ManagementGrid`
*   **Estrutura:** Uma grelha de botões ou cartões, cada um com um ícone e um título, agrupados por categoria.
*   **Grupos e Itens Sugeridos:**
    *   **Grupo "Pessoas":**
        *   `[ 🧑‍🎓 Alunos ]` → `/admin/alunos`
        *   `[ 👨‍🏫 Coaches ]` → `/admin/coaches`
        *   `[ 🤸 Atletas ]` → `/admin/atletas`
        *   `[ 🧪 Experimentais ]` → `/admin/experimentais`
    *   **Grupo "Académico":**
        *   `[ 🏫 Escolas ]` → `/admin/escolas`
        *   `[ 🥋 Turmas/Aulas ]` → `/admin/turmas`
        *   `[ 🥊 Modalidades ]` → `/admin/modalidades`
        *   `[ 📍 Locais ]` → `/admin/locais`
    *   **Grupo "Conteúdo e Finanças":**
        *   `[ 📚 Cursos ]` → `/admin/cursos`
        *   `[ 💰 Planos ]` → `/admin/planos`
        *   `[ 💶 Financeiro ]` → `/admin/financeiro`
        *   `[ ✨ Eventos ]` → `/admin/eventos`
    *   **Grupo "Plataforma":**
        *   `[ ⚙️ Configurações ]` → `/admin/configuracoes`
        *   `[ 🎯 Missões ]` → `/admin/missoes`
        *   `[ 📊 Critérios de Avaliação ]` → `/admin/avaliacao`
