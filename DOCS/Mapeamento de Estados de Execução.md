# Mapeamento de Estados de Execução

## Plataforma Kingdom Fight School (Mobile First)

Este documento mapeia **todos os estados possíveis de execução do sistema**, pensando na **vida real da academia**.

Objetivo:

> Evitar falhas operacionais, improviso e decisões confusas durante a aula.

---

# 1️⃣ Estados da AULA

### 1.1 Estados da Aula

|Estado|Descrição|Quem pode alterar|
|---|---|---|
|Criada|Aula cadastrada, futura|Admin|
|Aberta|Check-in liberado|Sistema|
|Em andamento|Aula começou|Sistema / Coach|
|Encerrada|Aula finalizada|Coach|
|Cancelada|Aula não acontece|Admin|

Regras:

- Check-in só funciona em **Aberta** ou **Em andamento**
    
- Pós-aula só aparece em **Encerrada**
    

---

# 2️⃣ Estados do CHECK-IN (Aluno)

### 2.1 Estados possíveis

|Estado|Significado|
|---|---|
|Não iniciado|Aluno não escaneou QR|
|⏳ Pendente|QR escaneado, aguardando coach|
|✔ Confirmado|Coach confirmou presença|
|❌ Recusado|Coach marcou ausência|
|⛔ Bloqueado|Fora do horário / plano inválido|

### 2.2 Casos especiais

- Aluno atrasado → Coach decide confirmar ou não
    
- Aluno sem celular → Coach pode confirmar manualmente
    

---

# 3️⃣ Estados do ALUNO

### 3.1 Status do Aluno

|Estado|Descrição|
|---|---|
|Ativo|Plano em dia|
|Inadimplente|Pagamento atrasado|
|Experimental|Aula teste|
|Bloqueado|Sem acesso às aulas|
|Atleta|Perfil avançado|

Regras:

- Inadimplente pode treinar (decisão da escola)
    
- Bloqueado não aparece para check-in
    

---

# 4️⃣ Estados da AULA EXPERIMENTAL

|Estado|Descrição|
|---|---|
|Agendada|Aula marcada|
|Confirmada|Aluno confirmou presença|
|Compareceu|Check-in confirmado|
|Não compareceu|Faltou|
|Convertido|Virou aluno|
|Perdido|Não houve conversão|

---

# 5️⃣ Estados do COACH (Execução)

|Estado|Significado|
|---|---|
|Preparação|Vendo alunos e experimentais|
|Em aula|Confirmando presenças|
|Pós-aula|Avaliando experimentais|
|Finalizado|Aula encerrada|

---

# 6️⃣ Estados FINANCEIROS

|Estado|Descrição|
|---|---|
|Pago|Em dia|
|Atrasado|Pagamento vencido|
|Isento|Aula experimental / cortesia|
|Cancelado|Plano encerrado|

---

# 7️⃣ Estados de EXCEÇÃO (Vida Real)

### 7.1 Aluno atrasado

- Check-in permitido
    
- Coach decide confirmar
    

### 7.2 Aula cheia

- Sistema bloqueia novos check-ins
    
- Experimental não entra sem liberação do coach
    

### 7.3 Aluno sem celular

- Coach confirma manualmente
    
- Sistema registra como "manual"
    

### 7.4 QR Code inválido

- Fora do local
    
- Fora do horário
    
- Aula errada
    

---

# 7️⃣A Estados de COMENTÁRIOS E ACOMPANHAMENTO (NOVO)

Este bloco cobre **anotações do coach**, fundamentais para evolução técnica e continuidade das aulas.

## 7A.1 Estados de Comentários no Perfil do Atleta

|Estado|Descrição|
|---|---|
|Criado|Comentário registrado pelo coach|
|Editado|Comentário atualizado|
|Arquivado|Comentário antigo, apenas histórico|
|Privado|Visível apenas para coaches|
|Compartilhado|Visível para o atleta|

Regras:

- Comentários **não podem ser apagados**, apenas arquivados
    
- Cada comentário registra: coach, data e aula relacionada
    

---

## 7A.2 Estados de Comentários da Aula

|Estado|Descrição|
|---|---|
|Planejado|Conteúdo que será passado|
|Executado|Conteúdo realmente treinado|
|Ajustado|Mudança em relação ao plano|

Regras:

- Coach pode escrever **antes ou depois** da aula
    
- Comentários servem como:
    
    - histórico técnico
        
    - alinhamento entre coaches
        
    - continuidade do método
        

---

# 8️⃣ Regras de OURO

1. Coach sempre pode intervir
    
2. Sistema nunca impede a aula
    
3. Dados refletem a realidade
    
4. Simplicidade > automação excessiva
    

---

## Este mapeamento garante:

- Menos erro
    
- Menos estresse
    
- Mais controle
    
- Base sólida para desenvolvimento
    

---

Próximo passo natural:  
➡️ transformar estes estados em **regras técnicas do MVP**.