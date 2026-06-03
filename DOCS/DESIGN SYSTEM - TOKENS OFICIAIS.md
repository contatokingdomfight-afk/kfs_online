# 🎨 DESIGN TOKENS OFICIAIS

**Kingdom Fight School – MVP**

> Tokens = decisões visuais centralizadas  
> Componentes só **consomem tokens**, nunca cores soltas.  
> **Marca 2026 (logotipo, ícone PWA, splash):** cores e paths em [`lib/brand.ts`](../lib/brand.ts) e [`PWA.md`](PWA.md) — `BRAND_BG` `#121416`, `BRAND_ICON_BG` `#000000`, primário `#9B111E`.

---

## 1️⃣ Filosofia dos Tokens (importante)

- Sem tokens “bonitos”, só **funcionais**
    
- Nomes **semânticos**, não visuais
    
- Pensado para:
    
    - suor
        
    - pouca luz
        
    - uso rápido no celular
        

---

## 2️⃣ Tokens de Cor (Core)

### 🎯 Paleta Semântica

Esses nomes **não mudam nunca**, só os valores.

|Token|Uso|
|---|---|
|`--bg`|Fundo da app|
|`--bg-secondary`|Fundo de cards|
|`--text-primary`|Texto principal|
|`--text-secondary`|Texto secundário|
|`--primary`|Ação principal (confirmar, salvar)|
|`--danger`|Ação crítica|
|`--border`|Bordas|
|`--success`|Presença confirmada|
|`--warning`|Experimental / pendente|

---

### 🌑 Dark Theme (default)

```css
:root[data-theme='dark'] {
  --bg: #0B0B0B;
  --bg-secondary: #141414;
  --text-primary: #FFFFFF;
  --text-secondary: #A1A1AA;
  --primary: #C1121F;     /* Vermelho Kingdom */
  --danger: #E11D48;
  --success: #22C55E;
  --warning: #FACC15;
  --border: #27272A;
}
```

---

### 🌕 Light Theme

```css
:root[data-theme='light'] {
  --bg: #FFFFFF;
  --bg-secondary: #F4F4F5;
  --text-primary: #09090B;
  --text-secondary: #52525B;
  --primary: #C1121F;     /* mantém identidade */
  --danger: #BE123C;
  --success: #16A34A;
  --warning: #EAB308;
  --border: #E4E4E7;
}
```

👉 Identidade mantém-se no vermelho.  
👉 Tema só muda contraste.

---

## 3️⃣ Tokens de Tipografia

### 🅰️ Fonte

- **Inter** (padrão global)
    

---

### 📐 Escala tipográfica (Mobile First)

|Token|Uso|
|---|---|
|`--text-xs`|labels, badges|
|`--text-sm`|texto secundário|
|`--text-base`|texto padrão|
|`--text-lg`|títulos pequenos|
|`--text-xl`|títulos principais|

```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
```

---

## 4️⃣ Tokens de Espaçamento

Baseado em **8px system** (padrão ouro mobile)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
```

Uso:

- padding
    
- gap
    
- margens
    

---

## 5️⃣ Tokens de Bordas & Forma

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
```

👉 Nada muito arredondado  
👉 Visual forte, esportivo

---

## 6️⃣ Tokens de Sombra (mínimo)

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.08);
--shadow-md: 0 4px 6px rgba(0,0,0,0.12);
```

Sombras só em:

- Card
    
- Modal
    

---

## 7️⃣ Tokens de Estado (UX)

Esses tokens guiam feedback visual:

|Estado|Token|
|---|---|
|Loading|`opacity: 0.6`|
|Disabled|`opacity: 0.4`|
|Active|`ring-primary`|
|Error|`border-danger`|

---

## 8️⃣ Tokens de Idioma (i18n – conceitual)

Não são CSS, mas fazem parte do sistema:

- `button.confirm`
    
- `button.save`
    
- `lesson.planning`
    
- `attendance.pending`
    

👉 Nenhum texto hardcoded.

---

## 9️⃣ Regras de Ouro (não quebrar)

1. ❌ Nunca usar cor direta no componente
    
2. ✅ Sempre usar token semântico
    
3. ❌ Nunca criar “só mais uma variação”
    
4. ✅ Tokens primeiro, componente depois
    

---

## 🥊 Resultado prático

Com isso vocês ganham:

- Consistência visual
    
- Dark / Light automático
    
- App em PT / EN sem refatorar
    
- Velocidade absurda com Cursor
    
- Identidade Kingdom clara
    

---

## Próximo passo lógico (recomendado)

Agora o caminho profissional é:

1️⃣ **Mapear tokens → Tailwind config**  
2️⃣ Criar **Button, Card e Input** já consumindo tokens  
3️⃣ Só depois começar telas

👉 Quer que eu **converta esses tokens diretamente para `tailwind.config.ts` + CSS variables**?  
Ou prefere que eu **crie os componentes base (Button, Card, Input)** usando esses tokens?

---

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md) — abril 2026.*
