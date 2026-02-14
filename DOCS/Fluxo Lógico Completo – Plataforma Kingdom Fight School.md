
# Fluxo Lógico Completo – Plataforma Kingdom Fight School

Este fluxo descreve **como a plataforma funciona do início ao fim**, integrando aluno, aula experimental, check-in com QR Code + confirmação do coach, gestão e online.

A lógica segue a realidade da academia: **aula acontece primeiro, sistema apenas organiza**.

---

## 1. Entrada no Ecossistema (Porta de Entrada)

Existem **3 portas principais** de entrada:

### 1.1 Aluno já matriculado

- Recebe login (app ou web)
    
- Acessa agenda
    
- Frequenta aulas presenciais
    
- Pode acessar aulas online
    

### 1.2 Aluno novo (Aula Experimental)

- Acessa página “Aula Experimental”
    
- Preenche formulário básico
    
- Escolhe modalidade + horário
    
- Entra no sistema como **Aluno Experimental**
    

### 1.3 Atleta

- Já é aluno
    
- Recebe perfil de atleta ativado pelo coach/admin
    

---

## 2. Fluxo da Aula Experimental (antes da aula)

1. Aluno novo escolhe:
    
    - Modalidade
        
    - Dia e horário disponíveis
        
2. Sistema:
    
    - Cria perfil 🧪 Experimental
        
    - Vincula o aluno à aula específica
        
    - Reserva vaga
        
3. Notificações:
    
    - Aluno recebe confirmação
        
    - Coach vê no painel:
        
        - Aula
            
        - Quantidade de experimentais
            

👉 **Antes da aula começar, o coach já sabe quem é experimental.**

---

## 3. Fluxo da Aula (Presencial – Núcleo do Sistema)

### 3.1 Antes da aula

- Sistema libera check-in
    
- QR Code da aula fica ativo
    

### 3.2 Check-in do aluno

1. Aluno chega na academia
    
2. Escaneia o QR Code
    
3. Sistema registra:
    
    - Hora
        
    - Aula
        
    - Status: ⏳ Aguardando confirmação
        

### 3.3 Confirmação do coach

- Coach abre a aula no sistema
    
- Visualiza lista:
    
    - Alunos regulares
        
    - 🧪 Experimentais
        
- Coach confirma presença
    
- Status muda para:
    
    - ✔ Presente
        
    - ❌ Ausente
        

👉 **Coach valida a realidade da aula.**

---

## 4. Durante a Aula

- Coach identifica facilmente:
    
    - Quem é novo
        
    - Quem é atleta
        
- Aula acontece normalmente
    
- Sistema não interfere no treino
    

---

## 5. Pós-Aula (Fechamento do Ciclo)

### 5.1 Aluno regular

- Presença registrada
    
- Frequência atualizada
    
- Impacta histórico mensal
    

### 5.2 Aluno experimental

- Sistema envia mensagem automática:  
    “Curtiu a aula? Quer continuar treinando?”
    
- Coach pode marcar:
    
    - Interessado
        
    - Perfil atleta
        
    - Precisa adaptação
        
    - Não retornou
        

👉 **Aqui acontece a conversão.**

---

## 6. Fluxo do Aluno Matriculado (Ciclo Contínuo)

- Aluno acessa agenda
    
- Frequenta aulas
    
- Faz check-in
    
- Coach confirma
    
- Frequência é acumulada
    
- Pagamento é monitorado
    

Se:

- Frequência cai → alerta
    
- Pagamento atrasa → alerta
    

---

## 7. Fluxo do Atleta (Camada Avançada)

Além do fluxo normal:

- Coach registra avaliações periódicas
    
- Sistema gera histórico de evolução
    
- Atleta acompanha progresso
    
- Base para:
    
    - Lutas
        
    - Preparação
        
    - Planejamento
        

---

## 8. Escola Online (Fluxo Paralelo)

- Aluno/Atleta acessa aulas online
    
- Conteúdo organizado por:
    
    - Modalidade
        
    - Nível
        
- Online:
    
    - Complementa o presencial
        
    - Não substitui a aula
- Tipos de conteúdo:
  - Vídeos, artigos, imagens e ETC...
        

👉 **Retenção + valor agregado.**

---

## 9. Fluxo Financeiro (Sempre Rodando em Background)

- Aluno tem plano ativo
    
- Sistema verifica status:
    
    - Pago
        
    - Atrasado
        
- Administração acompanha:
    
    - Receita
        
    - Inadimplência
        
- **Remuneração de coaches (futuro):** regras e valores configuráveis pela plataforma; ver doc *Remuneração de Coaches — Configurável (Futuro)*
        

---

## 10. Visão Geral (Resumo Mental)

Aluno → Agenda → Aula → QR Code → Coach confirma → Histórico

Experimental → Aula → Atenção do coach → Pós-aula → Conversão

Coach → Aula → Presença → Avaliação

Admin → Tudo organizado, sem papel

---

## 11. Princípio Central do Fluxo

> **O sistema serve a aula.**  
> **O coach valida a realidade.**  
> **Os dados são consequência, não objetivo.**

---

Este fluxo já é suficiente para:

- Criar o MVP
    
- Treinar coaches
    
- Padronizar a operação
    
- Escalar com controle
    

Próximo passo natural:  
➡️ transformar este fluxo em **telas do sistema**.