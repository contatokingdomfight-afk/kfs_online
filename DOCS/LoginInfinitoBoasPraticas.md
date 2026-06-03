# Documento de Boas Práticas

> Complemento operacional do projeto KFS. Implementação actual: [`memory.md`](memory.md) (Sessão web), [`PWA.md`](PWA.md). Índice: [`INDEX.md`](INDEX.md).

## Persistência de Sessão no Supabase (“Nunca Deslogar”)

---

# Objetivo

Garantir que usuários permaneçam autenticados pelo maior tempo possível em aplicações web utilizando [Supabase](https://supabase.com?utm_source=chatgpt.com), minimizando logouts inesperados sem comprometer segurança, estabilidade e escalabilidade.

---

# Princípios Fundamentais

A ideia de “nunca deslogar” deve ser entendida como:

* Sessão persistente
* Renovação automática de tokens
* Recuperação silenciosa da autenticação
* UX contínua
* Re-login extremamente raro

Não significa:

* Tokens infinitos
* Sessões imutáveis
* Segurança desativada

---

# Arquitetura Recomendada

## Frontend

Responsável por:

* Persistir sessão localmente
* Renovar tokens automaticamente
* Sincronizar auth entre abas
* Recuperar sessão após reload

Tecnologias recomendadas:

* React
* Next.js
* Vue/Nuxt
* SvelteKit

---

## Backend

Responsável por:

* Validar tokens
* Renovar sessão server-side
* Proteger rotas SSR/API
* Manter cookies HTTP-only

---

# Configuração Recomendada do Supabase Client

## Configuração ideal

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
)
```

---

# Explicação das Configurações

| Configuração       | Função                         |
| ------------------ | ------------------------------ |
| persistSession     | Mantém login salvo             |
| autoRefreshToken   | Renova tokens automaticamente  |
| detectSessionInUrl | Captura login OAuth/magic link |
| flowType: 'pkce'   | Fluxo moderno e mais seguro    |

---

# Persistência Correta da Sessão

## Sempre usar localStorage

O Supabase usa `localStorage` por padrão.

Isso permite:

* Fechar navegador
* Reiniciar computador
* Abrir nova aba
* Manter login

---

## Nunca usar sessionStorage

Problemas:

* Sessão morre ao fechar aba
* Logout inesperado
* UX ruim

---

# Estratégia Recomendada de Token

## Access Token curto

Recomendação:

* 30–60 minutos

Motivo:

* Segurança
* Menor impacto em vazamentos

---

## Refresh Token longo

Responsável pela experiência persistente.

O usuário pode permanecer logado por:

* semanas
* meses
* anos

desde que:

* refresh continue válido
* sessão seja renovada

---

# Configurações Recomendadas no Dashboard

No painel do Supabase:

Authentication → Settings

---

## JWT Expiry

Recomendado:

```txt
3600 segundos (1 hora)
```

---

## Timebox

Evitar valores muito agressivos.

Recomendado:

* vários meses
* ou desabilitado se aceitável

---

## Inactivity Timeout

Recomendado:

* longo
* 30–90 dias

Isso evita logout por inatividade pequena.

---

# SSR e Cookies

## Recomendação Moderna

Usar:

```txt
@supabase/ssr
```

Documentação:
[Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side?utm_source=chatgpt.com)

---

# Problema Mais Comum

A maioria dos “deslogamentos aleatórios” NÃO vem do Supabase.

Vem de:

* middleware incorreto
* cookies inválidos
* race conditions
* hidratação SSR
* refresh mal implementado

---

# Estratégia Correta para Next.js

## Fluxo ideal

### Cliente

* lê sessão
* mantém refresh ativo

### Middleware

* valida cookie
* renova sessão

### Servidor

* usa sessão renovada

---

# Evitar Race Conditions

## Problema clássico

O app verifica auth antes da sessão carregar.

Resultado:

* redirect falso para login
* logout fantasma

---

## Solução

Sempre esperar hidratação:

```ts
const {
  data: { session },
} = await supabase.auth.getSession()
```

ou:

```ts
const {
  data: { user },
} = await supabase.auth.getUser()
```

antes de:

* proteger rota
* redirecionar
* renderizar dashboard

---

# Tratamento Correto do onAuthStateChange

## Recomendado

```ts
supabase.auth.onAuthStateChange((event, session) => {
  console.log(event)

  switch (event) {
    case 'SIGNED_IN':
      break

    case 'TOKEN_REFRESHED':
      break

    case 'SIGNED_OUT':
      break
  }
})
```

---

# Eventos Importantes

| Evento          | Significado        |
| --------------- | ------------------ |
| SIGNED_IN       | Login realizado    |
| TOKEN_REFRESHED | Sessão renovada    |
| SIGNED_OUT      | Logout             |
| USER_UPDATED    | Usuário atualizado |

---

# Multi-Abas

O Supabase sincroniza auth entre abas automaticamente.

Benefícios:

* login em uma aba autentica todas
* logout sincronizado
* refresh compartilhado

---

# PWA e Mobile

## Problema

Browsers mobile podem:

* suspender abas
* matar timers
* limpar memória

---

## Solução

Ao retornar foco:

```ts
window.addEventListener('focus', async () => {
  await supabase.auth.refreshSession()
})
```

---

# Estratégia “Tipo Gmail”

## Objetivo

Usuário raramente vê login novamente.

---

## Regras

### 1. Sessão persistente

Obrigatório:

* persistSession = true

---

### 2. Refresh silencioso

Obrigatório:

* autoRefreshToken = true

---

### 3. Cookies estáveis

Evitar:

* cookies temporários
* SameSite incorreto
* domínio errado

---

### 4. Reauth invisível

Quando refresh falhar:

* tentar recuperar sessão
* evitar logout imediato

---

# Estratégia de Recuperação

## Fluxo ideal

```txt
token expirou
↓
tenta refresh
↓
refresh falhou?
↓
tenta recuperar sessão
↓
falhou novamente?
↓
logout
```

---

# Segurança Recomendada

## Nunca fazer

### JWT infinito

Problemas:

* vazamento permanente
* sessões impossíveis de revogar

---

### Armazenar tokens manualmente

Evitar:

* cookies customizados inseguros
* IndexedDB manual
* serialização própria

---

### Desativar rotação

Tokens devem rotacionar.

---

# Logout Inteligente

## Não deslogar automaticamente por erros temporários

Evitar:

```ts
catch {
  logout()
}
```

---

## Melhor abordagem

```ts
catch (err) {
  console.error(err)

  // tenta recuperar sessão antes
}
```

---

# Estratégia Offline

## Recomendado

Permitir:

* leitura local
* cache de sessão
* retry automático

---

# Observabilidade

## Monitorar

* frequência de logout
* falha de refresh
* erros de cookie
* expiração inesperada
* múltiplos refresh consecutivos

---

# Checklist Final

## Cliente

* [ ] persistSession habilitado
* [ ] autoRefreshToken habilitado
* [ ] flowType PKCE
* [ ] recuperação ao focar aba
* [ ] hidratação correta
* [ ] evitar redirects prematuros

---

## Servidor

* [ ] usar @supabase/ssr
* [ ] cookies HTTP-only
* [ ] middleware correto
* [ ] refresh server-side

---

## Dashboard

* [ ] JWT expiry razoável
* [ ] inactivity timeout longo
* [ ] timebox não agressivo

---

## Segurança

* [ ] tokens rotacionando
* [ ] logout recuperável
* [ ] sem JWT infinito
* [ ] sem storage manual inseguro

---

# Resultado Esperado

Com essas práticas, o usuário normalmente:

* entra apenas uma vez
* permanece autenticado por meses
* raramente vê login novamente
* troca abas sem perder sessão
* recarrega página sem logout
* fecha navegador sem perder autenticação

Experiência equivalente a:

* Gmail
* Discord
* Notion
* Slack
* WhatsApp Web

---

# Referências Oficiais

* [Supabase Auth Docs](https://supabase.com/docs/guides/auth?utm_source=chatgpt.com)
* [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side?utm_source=chatgpt.com)
* [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction?utm_source=chatgpt.com)
