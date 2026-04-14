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

*Referência cruzada: [INDEX.md](INDEX.md), [memory.md](memory.md).*
