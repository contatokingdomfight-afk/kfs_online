# Progressive Web App (PWA) — KFS Online

> **Última revisão:** abril 2026.  
> **Capacitor (Android/iOS)** mantém-se como fase seguinte no roadmap; o PWA é a base web instalável. Ver `DOCS/ROADMAP_Plataforma_KFS.md` (resumo executivo: mobile / Capacitor).

## O que está implementado

| Área | Detalhe |
|------|---------|
| **Manifest** | `app/manifest.ts` → rota `/manifest.webmanifest` (`display: standalone`, `theme_color` / `background_color` **#ED1C24**, ícones). |
| **Ícones** | `public/icons/` — `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` gerados a partir de **`KFS Logo.png`** na raiz. |
| **Regenerar ícones** | `npm run generate:pwa-icons` (script: `scripts/generate-pwa-icons.ts`, usa **sharp**). |
| **Metadados** | `app/layout.tsx` — `applicationName`, `appleWebApp`, `icons` (favicon dinâmico continua em `app/icon.tsx`, alinhado à cor de marca). |
| **Service worker** | `public/sw.js` — `install` / `activate` + handler `fetch` que em caso de falha devolve `Response.error()` (critérios de instalação no Chrome Android; sem promessa rejeitada no SW). Registo só em **produção** via `components/PwaServiceWorkerRegister.tsx`. |
| **Dica de instalação** | `PwaInstallProvider` + `PwaInstallHint.tsx`: primeiro aviso em ecrãs ≤768px (estilo destacado); «Agora não» ou × grava `kfs-pwa-sidebar-mode` e o aviso some. Depois, `SidebarPwaInstall` no menu lateral: com `beforeinstallprompt` (Chromium) mostra «Instalar app»; no **Safari** e outros sem API nativa, o mesmo estilo de botão abre um **modal** com passos (`lib/pwa-install-ui.ts`). Migração: quem tinha o dismiss antigo passa para modo menu (`lib/pwa-install-storage.ts`). |
| **Modo standalone** | `components/PwaDisplayMode.tsx` define `data-pwa-standalone` no `<html>`; `app/globals.css` ajusta `min-height` do `body` em modo app. |
| **Middleware** | `middleware.ts` — matcher exclui `sw.js` e `manifest.webmanifest` para não redirecionar para login. |
| **Sessão (app instalada)** | O mesmo fluxo Supabase que no browser: `components/AuthSessionKeepAlive.tsx` no layout raiz chama `refreshSession()` ao voltar à app / `pageshow` e intervalo com o ecrã visível; `lib/supabase/client.ts` força `persistSession` + `autoRefreshToken`. |

### Sessão longa no telemóvel (evitar “deslogar” sozinho)

**No código** já renovamos tokens ao reabrir a PWA e periodicamente com a app aberta. Ainda assim podes ver logout se:

1. **Supabase Auth (projeto)** — Dashboard → **Authentication** → **Sessions** (ou *Settings* / *Advanced* conforme a UI):
   - **Inactivity timeout** ou **Time-box user sessions**: se estiverem activos (muitas vezes em planos Pro+), encerram a sessão após X tempo **sem refresh**. Para “ficar logado” o máximo possível, desactiva time-box / inactividade ou aumenta o valor ao que o negócio aceitar em segurança.
   - **Single session per user**: com isto activo, um novo login (outro telemóvel ou browser) pode invalidar a sessão anterior — parece “logout misterioso”.
2. **Browser / SO**: pouco espaço, “limpar dados do site”, modo privado ou políticas agressivas (ex.: alguns modos de poupança de dados) podem apagar cookies — não há controlo total pela app.

**Expectativa realista:** “Sempre logado para sempre” sem reautenticar **não** é garantido por segurança e por limites da Web; o objectivo é **manter a sessão o mais longo possível** enquanto o refresh token for válido e os cookies existirem.

## Desinstalar e voltar a instalar (limitações da plataforma)

- **Não existe evento nem API fiável** na Web para saber que o utilizador **removeu** a PWA do ecrã principal ou da gaveta de apps. O site só pode reagir ao que corre **dentro do browser** (ex.: `beforeinstallprompt`, `appinstalled`).
- O Chrome **pode demorar** a voltar a emitir `beforeinstallprompt` depois de uma desinstalação (critérios internos de engajamento). Nesse intervalo o nosso botão «Instalar app» pode não aparecer; o utilizador pode usar **menu ⋮ → Instalar app** (Android) ou **Partilhar → Ecrã principal** (iOS).
- **`appinstalled`**: o cliente regista um timestamp em `localStorage` (`kfs-pwa-appinstalled-at`, ver `lib/pwa-install-storage.ts`) quando a instalação é concluída — serve para suporte/diagnóstico, **não** indica desinstalação.

## Testes rápidos

1. **Produção local:** `npm run build` → `npm start` → Chrome DevTools → **Application** → Manifest / Service Workers.  
2. **Instalar:** menu do browser “Instalar app” / iOS Safari “Adicionar ao ecrã principal”.  
3. **Lighthouse:** categoria PWA (HTTPS em produção).

## Ficheiros principais

- `app/manifest.ts`
- `public/sw.js`
- `public/icons/*.png`
- `components/PwaServiceWorkerRegister.tsx`, `components/PwaDisplayMode.tsx`
- `scripts/generate-pwa-icons.ts`

---

*Referência cruzada: [INDEX.md](INDEX.md), [docs/memory.md](../docs/memory.md).*
