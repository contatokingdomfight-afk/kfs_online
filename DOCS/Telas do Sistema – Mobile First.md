# 📱 SISTEMA DE TELAS — VERSÃO ATUALIZADA (MOBILE FIRST)

## 1️⃣ Login / Entrada

**Tela: Login**

- Email / Telefone
    
- Senha
    
- Botão: Entrar
    

➡️ Redireciona conforme o tipo de usuário:

- Aluno
    
- Coach
    
- Admin
    

---

## 2️⃣ Home do Coach (Tela Principal)

**Elementos (ordem vertical):**

- 🔔 Alertas
    
    - “1 aula experimental hoje”
        
    - “Turma cheia”
        
- 📅 Próxima aula
    
    - Modalidade
        
    - Horário
        
    - Nº de alunos
        
- 📋 Botão principal:  
    **“Entrar na aula”**
    
- 👥 Atletas sob acompanhamento
    
- 📊 Acesso rápido:
    
    - Frequência
        
    - Avaliações
        

👉 Essa é a tela mais usada do coach.

---

## 3️⃣ Tela da Aula (núcleo do sistema)

### Estado único (com ações contextuais)

**Topo**

- Modalidade
    
- Data / Horário
    
- Coach responsável
    

**Bloco: Planejamento da Aula**

- Campo editável:
    
    - “O que será / foi trabalhado”
        
- Visível apenas para coaches
    
- Editável a qualquer momento
    

**Bloco: Check-in**

- QR Code fixo da aula
    
- Lista de alunos:
    
    - ⏳ Aguardando confirmação
        
    - ✅ Presente
        
    - 🧪 Experimental
        
- Ação do coach:
    
    - Confirmar presença
        

**Bloco: Ações rápidas**

- ➕ Comentário geral da aula
    
- ➕ Comentário em atleta
    

---

## 4️⃣ Tela de Check-in do Aluno

**Aluno escaneia QR Code**

**Tela mostra:**

- Nome da aula
    
- Horário
    
- Status:
    
    - “Aguardando confirmação do coach”
        

Após confirmação:

- ✅ Presença confirmada
    

---

## 5️⃣ Perfil do Atleta (Tela gamificada – aluno e coach)

**Header**

- Botão voltar | Título “Perfil do Atleta”
- **Nível** e **faixa** (cores: Branca → … → Dourado N)
- **Barra de XP** (progresso até próxima faixa; progressão em dobro por nível)

**Bloco: Status gerais (core attributes)**

- Cartões: Técnico, Tático, Físico, Mental, Teórico
- Cada um: ícone, score 1–10, barra de progresso (0–3 vermelho, 4–6 amarelo, 7–10 verde), Média Geral

**Bloco: Gráfico radar**

- Eixos: os cinco atributos; tema Kingdom Fight (vermelho/preto); animação no carregamento (Recharts)

**Bloco: Detalhe por componente (accordion)**

- Secções por dimensão; dentro de cada uma, grupos por modalidade (filtrado pela **modalidade principal do aluno**)
- Cada critério: nome, pergunta/descrição, rating 1–5 estrelas, barra opcional

**Bloco: Missões ativas**

- Missões do sistema (ex.: “Subir Físico para X”) + missões configuráveis (Admin) + missão “Realizar/Renovar avaliação física” (obrigatória a cada 6 meses)
- Alvo, recompensa XP, indicador de progresso

**Bloco: Feedback do coach**

- Card de citação (avatar, texto)

**Coach:** no perfil do atleta/aluno, link para **Avaliação física** (ficha anamnese) e estado da última avaliação (data, próxima renovação, liberação).

**Bloco: Histórico de Aulas / Comentários do Coach**

- Lista por data; timeline de comentários (Coach, data, texto, visibilidade). Botão ➕ Adicionar comentário.

---

## 5b️⃣ Tela: Avaliação Física (Coach)

**Acesso:** Perfil do aluno ou Perfil do atleta (link para o aluno) → “Realizar avaliação física” / “Nova avaliação física”.

**Formulário (10 secções):**

1. Identificação do aluno (pré-preenchida: nome, nascimento, idade, sexo, altura, peso, contacto, email, data avaliação, instrutor)
2. Objetivo do aluno (checkbox: condicionamento, defesa pessoal, competição, emagrecimento, ganho massa, lazer, outro)
3. Histórico de saúde (condições médicas, medicação, lesões)
4. PAR-Q (prontidão para exercício – Sim/Não; se SIM → encaminhar avaliação médica)
5. Nível de atividade física (sedentário a muito ativo; experiência em artes marciais)
6. Avaliação física (sinais vitais, mobilidade, postura)
7. Testes físicos (flexões, abdominais, prancha, agachamentos, corrida opcional)
8. Avaliação do instrutor (1–10: condição, mobilidade, coordenação, resistência, força + observações)
9. Termo de responsabilidade (assinatura do aluno)
10. Liberação (Apto / Apto com restrições / Necessita avaliação médica)

**Regras:** Renovação obrigatória a cada 6 meses; quando vencida, a missão “Renovar avaliação física” aparece no dashboard do aluno.

---

## 6️⃣ Tela: Adicionar Comentário

**Campos:**

- Tipo:
    
    - Perfil do atleta
        
    - Aula
        
- Texto livre
    
- Visibilidade:
    
    - Apenas coaches
        
    - Compartilhar com atleta
        
- Salvar
    

📱 Pensada para:

- Pós-treino
    
- Uso rápido
    
- Sem burocracia
    

---

## 7️⃣ Tela de Aula Experimental

**Fluxo simples**

**Cadastro:**

- Nome
    
- Contato
    
- Modalidade
    
- Data / horário
    

**Na aula:**

- Aparece na lista como 🧪 Experimental
    
- Coach confirma presença
    

**Pós-aula:**

- Ação rápida:
    
    - “Converter em aluno”
        

---

## 8️⃣ Home do Aluno

**Elementos:**

- Próxima aula
    
- Botão: Check-in
    
- Frequência / plano atual
    
- Link para **Perfil do Atleta** (Performance detalhada: faixas, XP, radar, missões, avaliação física)
    
- Comentários recebidos (se compartilhados)
    
- Acesso às aulas online
    

---

## 9️⃣ Tela do Admin (resumida)

- Turmas
    
- Presença
    
- Financeiro básico
    
- Aulas experimentais
    
- Coaches
    
- **Missões** – Criar/eliminar missões configuráveis (nome, descrição, modalidade, faixa, XP, ordem); aplicáveis ao Perfil do Atleta do aluno.
    
- **Remuneração de coaches (futuro):** configuração de regras e relatório mensal; ver doc *Remuneração de Coaches — Configurável (Futuro)*
    

---

# 🔁 REGRA DE OURO DO SISTEMA

- Tudo em **1–2 cliques**
    
- Coach escreve pouco, mas sempre no lugar certo
    
- Nenhuma ação obrigatória
    
- Sistema serve o treino, não o contrário
    

---

## Próximo passo lógico (sem pular etapa)

Agora temos três caminhos naturais:

1️⃣ **Wireframes tela por tela (blocos desenhados)**  
2️⃣ **Estados de execução detalhados (loading, erro, vazio)**  
3️⃣ **Modelo de dados (banco / lógica por trás)**

👉 Qual seguimos agora?