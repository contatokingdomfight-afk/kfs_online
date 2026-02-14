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

## 5️⃣ Perfil do Atleta (Tela mais rica)

**Topo**

- Foto
    
- Nome
    
- Modalidade(s)
    
- Status:
    
    - Aluno / Atleta
        

**Bloco: Resumo**

- Frequência
    
- Última aula
    
- Coach principal
    

**Bloco: Histórico de Aulas**

- Lista simples por data
    

**Bloco: Comentários do Coach**

- Timeline cronológica
    
- Cada comentário:
    
    - Coach
        
    - Data
        
    - Texto
        
    - Visibilidade:
        
        - 🔒 Privado
            
        - 👤 Compartilhado
            

**Botão flutuante**  
➕ **Adicionar comentário**

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
    
- Frequência
    
- Comentários recebidos (se compartilhados)
    
- Acesso às aulas online
    

---

## 9️⃣ Tela do Admin (resumida)

- Turmas
    
- Presença
    
- Financeiro básico
    
- Aulas experimentais
    
- Coaches
    
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