# Progressive Web App (PWA) — KFS Online

> **Última revisão:** abril 2026.  
> **Capacitor (Android/iOS)** mantém-se como fase seguinte no roadmap; o PWA é a base web instalável. Ver `DOCS/ROADMAP_Plataforma_KFS.md` §17.

## O que está implementado

| Área | Detalhe |
|------|---------|
| **Manifest** | `app/manifest.ts` → rota `/manifest.webmanifest` (`display: standalone`, `theme_color` / `background_color` **#ED1C24**, ícones). |
| **Ícones** | `public/icons/` — `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` gerados a partir de **`KFS Logo.png`** na raiz. |
| **Regenerar ícones** | `npm run generate:pwa-icons` (script: `scripts/generate-pwa-icons.ts`, usa **sharp**). |
| **Metadados** | `app/layout.tsx` — `applicationName`, `appleWebApp`, `icons` (favicon dinâmico continua em `app/icon.tsx`, alinhado à cor de marca). |
| **Service worker** | `public/sw.js` — pass-through para a rede (sem cache de HTML/API; evita sessões desatualizadas). Registo só em **produção** via `components/PwaServiceWorkerRegister.tsx`. |
| **Modo standalone** | `components/PwaDisplayMode.tsx` define `data-pwa-standalone` no `<html>`; `app/globals.css` ajusta `min-height` do `body` em modo app. |
| **Middleware** | `middleware.ts` — matcher exclui `sw.js` e `manifest.webmanifest` para não redirecionar para login. |

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
