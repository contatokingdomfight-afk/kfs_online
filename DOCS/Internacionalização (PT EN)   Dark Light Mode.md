# 🌍 Internacionalização (PT / EN) + 🌗 Dark / Light Mode

**Design System + App**

## Visão geral (bem objetiva)

- 🌍 Idiomas: **Português 🇧🇷 / Inglês 🇬🇧**
    
- 🌗 Tema: **Dark / Light**
    
- 📱 Mobile First
    
- ⚡ Zero refatoração no futuro
    

---

## 1️⃣ Idiomas (PT / EN) — abordagem correta

### ✅ Estratégia recomendada

Usar **i18n simples por chave**, não texto hardcoded.

Exemplo mental:

- `"checkin.confirm"`
    
- `"lesson.planning"`
    

Nunca:

- `"Confirmar presença"` direto no componente.
    

---

### 📂 Estrutura simples de tradução

```
/locales
 ├── pt.json
 └── en.json
```

**pt.json**

```json
{
  "login.title": "Entrar",
  "button.confirm": "Confirmar",
  "lesson.planning": "Planejamento da aula",
  "comment.add": "Adicionar comentário"
}
```

**en.json**

```json
{
  "login.title": "Login",
  "button.confirm": "Confirm",
  "lesson.planning": "Lesson planning",
  "comment.add": "Add comment"
}
```

---

### 🧠 Como o app decide o idioma

Ordem inteligente:

1. Preferência salva do usuário
    
2. Idioma do sistema do celular
    
3. Default: **Português**
    

O aluno pode trocar depois.

---

### 📱 Onde fica o seletor de idioma (Mobile First)

- Tela de **Perfil do Aluno**
    
- Opção simples:
    
    - 🇧🇷 Português
        
    - 🇬🇧 English
        

Nada intrusivo.

---

## 2️⃣ Dark / Light Mode — do jeito certo

### ✅ Estratégia recomendada

Usar **Tailwind + CSS variables**  
Nada de duplicar componentes.

---

### 🎨 Tokens de cor (conceito)

Você define **cores semânticas**, não cores fixas:

- `--bg`
    
- `--text`
    
- `--primary`
    
- `--card`
    

Depois troca os valores conforme o tema.

---

### 🌗 Temas disponíveis

- 🌑 Dark (default — ideal para academia)
    
- 🌕 Light (opcional para alunos)
    

📌 Coaches podem ficar **sempre em Dark**, se quiserem.

---

### 📱 Onde fica o toggle Dark / Light

- Perfil do usuário
    
- Ícone simples:
    
    - 🌙 / ☀️
        

---

## 3️⃣ Integração com o Design System

### Componentes já nascem preparados

Exemplo conceitual:

- Button não sabe se é dark ou light
    
- Ele só usa `bg-primary`
    
- O tema decide a cor
    

👉 Isso é **Design System de verdade**.

---

## 4️⃣ Cursor — como isso ajuda MUITO

Você pode trabalhar assim:

> “Create a Button component using Tailwind that supports dark and light themes and uses translation keys”

Ou:

> “Replace hardcoded text with i18n keys in this page”

Cursor entende muito bem esse padrão.

---

## 5️⃣ O que DEFINITIVAMENTE vale a pena agora

✔️ Estrutura de idiomas  
✔️ Chaves de tradução  
✔️ Dark / Light desde o começo

❌ Não precisa:

- Tradução perfeita agora
    
- Idiomas extras
    
- Sistema complexo de localização
    

---

## 🥊 Resumo direto

Sim, dá para fazer **agora** e é **muito inteligente**:

- 🇧🇷🇬🇧 PT / EN → estrutura pronta
    
- 🌗 Dark / Light → experiência premium
    
- 📱 Mobile First → uso real no tatame
    
- ⚡ Zero retrabalho depois
    

---

## Próximo passo ideal (sugestão profissional)

Agora temos dois caminhos MUITO bons:

1️⃣ **Definir oficialmente os tokens do Design System**  
(cor, texto, espaçamento, estados)

2️⃣ **Criar os primeiros componentes reais**

- Button
    
- Card
    
- Input  
    já com:
    
- i18n
    
- Dark / Light
    

👉 Qual você prefere fazer agora?  
(Se quiser, já escrevo **o código base dos componentes** pronto para colar no projeto.)