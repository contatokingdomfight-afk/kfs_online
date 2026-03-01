# Guia de Teste – Loja e Receita Adicional

> Como testar cada item da funcionalidade **Receita adicional** (Loja, Compras, Inscrições).

---

## Pré-requisitos

- Aplicação em execução (`npm run dev`) ou deploy na Vercel
- Conta de **aluno** (para testar a Loja)
- Conta de **admin** (para testar Compras e Inscrições)
- Pelo menos **1 curso** com compra avulsa ativada e preço definido
- Pelo menos **1 evento** (Camp ou Workshop) com data futura

---

## 1. Preparar dados de teste (Admin)

### 1.1 Criar curso disponível para compra

1. Faz login como **Admin**
2. Vai a **Admin** → **Cursos / Biblioteca**
3. Clica em **Novo curso** (ou edita um existente)
4. Preenche:
   - Nome: ex. "Técnica de Low Kick"
   - Categoria: Técnica
   - Marca **"Disponível para compra avulsa"**
   - Define **Preço** (ex.: 25)
5. Guarda

### 1.2 Criar evento (Camp ou Workshop)

1. Em **Admin** → **Eventos**
2. Clica em **Novo evento**
3. Preenche:
   - Nome: ex. "Kingdom Fight Camp - Verão"
   - Tipo: Camp ou Workshop
   - Data: uma data futura
   - Preço: ex. 50
4. Guarda

---

## 2. Testar a Loja (como Aluno)

### 2.1 Aceder à Loja

1. Faz login como **aluno** (ou usa "Ver como Aluno" no Admin)
2. No menu lateral, clica em **Loja**
3. Deves ver:
   - Secção **"Cursos disponíveis"** com os cursos que têm compra avulsa
   - Secção **"Eventos em breve"** com os eventos futuros

### 2.2 Comprar um curso

1. Na Loja, localiza um curso na secção de cursos
2. Clica no botão **"Comprar por €XX"**
3. Confirma no popup (ex.: "Comprar por €25? O pagamento será acertado na escola.")
4. A página recarrega e o curso passa a mostrar **"Já tens acesso →"**
5. Clica no link para abrir o curso na Biblioteca e verificar que tens acesso ao conteúdo

### 2.3 Inscrever-me num evento

1. Na Loja, localiza um evento na secção de eventos
2. Clica no botão **"Inscrever-me"**
3. Confirma no popup (ex.: "Inscrever-me em Kingdom Fight Camp (€50)? O pagamento será acertado na escola.")
4. A página recarrega e o evento passa a mostrar **"✓ Inscrito"**

### 2.4 Verificar que cursos já comprados aparecem na Loja

1. Se já compraste um curso, na Loja ele deve aparecer com **"Já tens acesso →"**
2. Clica no link e confirma que abres a página do curso na Biblioteca

---

## 3. Testar Admin – Compras e Inscrições

### 3.1 Ver compras de cursos

1. Faz login como **Admin**
2. Vai a **Admin** → **Financeiro**
3. Clica no botão **"Compras e inscrições"**
4. Na secção **"Compras de cursos"**, deves ver:
   - Nome do aluno
   - Nome do curso
   - Valor (€)
   - Data da compra
   - Estado (Pago)

### 3.2 Ver inscrições em eventos

1. Na mesma página **Compras e inscrições**
2. Na secção **"Inscrições em eventos"**, deves ver:
   - Nome do aluno
   - Nome do evento
   - Data do evento
   - Estado (Pendente ou Confirmado)
   - Link **"Ver evento →"** para o detalhe do evento

### 3.3 Ir ao evento a partir da inscrição

1. Clica em **"Ver evento →"** numa inscrição
2. Deves ser redirecionado para a página de edição do evento (`/admin/eventos/[id]`)
3. Aí podes confirmar inscrições e ver a lista de inscritos

---

## 4. Casos de teste adicionais

### 4.1 Loja vazia

- Se não houver cursos para compra nem eventos futuros, a Loja mostra a mensagem:
  - "Não há cursos nem eventos disponíveis para compra ou inscrição no momento."
  - Com links para Biblioteca e Eventos

### 4.2 Duplicar compra

- Tenta comprar o mesmo curso duas vezes
- Deves receber a mensagem: "Já tens acesso a este curso."

### 4.3 Duplicar inscrição

- Tenta inscrever-te no mesmo evento duas vezes
- Deves receber a mensagem: "Já estás inscrito neste evento."

### 4.4 Evento sem login

- Sem sessão, a Loja não deve permitir comprar/inscrever (o botão pode não aparecer ou redirecionar para login)

---

## 5. Resumo dos URLs

| Funcionalidade | URL (aluno) | URL (admin) |
|----------------|-------------|-------------|
| Loja | `/dashboard/loja` | — |
| Biblioteca (cursos) | `/dashboard/biblioteca` | `/admin/cursos` |
| Eventos | `/dashboard/eventos` | `/admin/eventos` |
| Compras e inscrições | — | `/admin/financeiro/compras` |

---

*Última atualização: fevereiro 2026*
