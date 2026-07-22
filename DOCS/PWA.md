# Progressive Web App (PWA) — KFS Online

> **Última revisão:** 22 maio 2026 — identidade visual 2026: ícones com alpha, splash preto único, `kfs-app-icon.png`.  
> **Distribuição mobile:** [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md). **Capacitor:** [`CAPACITOR.md`](CAPACITOR.md).

## O que está implementado

| Área | Detalhe |
|------|---------|
| **Manifest** | `app/manifest.ts` → `/manifest.webmanifest` — `display: fullscreen`, `background_color` e `theme_color` = **`#000000`** (`BRAND_ICON_BG` em `lib/brand.ts`). Ícones: `/icons/kfs-emblem-*.png`. |
| **Ícones (fonte)** | Preferência: **`public/brand/kfs-app-icon.png`** (1024×1024, fundo transparente). Fallback: `kfs-emblem-icon.png`. Pipeline em `scripts/prepare-brand-icon-source.mjs` + `scripts/generate-pwa-icons.ts`. |
| **Ícones (gerados)** | `public/icons/kfs-emblem-{192,512,512-maskable,180}.png` — manifest usa PNG com **fundo transparente** (só o logo) para o splash nativo não desenhar uma «caixa» preta sobre fundo cinza. Aliases legados: `icon-192.png`, etc. Favicon: `app/icon.png` (48px, opaco). |
| **Regenerar** | `npm run generate:pwa-icons` (corre também `npm run process:brand-logo`). Após mudar ícones: bump `SW_VERSION` em `public/sw.js` e **reinstalar** a PWA no telemóvel. |
| **Splash de arranque** | **Nativo (SO):** `background_color` + ícone do manifest. **React:** `components/PwaLaunchSplash.tsx` — ecrã `#000000` + `BrandSplashLogo` → `kfs-app-icon.png` transparente (cobre transição até a app carregar). **Dashboard:** `DashboardSplash` na primeira visita à sessão. |
| **UI geral** | Header com texto «Kingdom Fight School» (sem logotipo grande). Tema da app após login: tokens `--bg` em `globals.css` (grafite `#0b0b0b` / `#121416` na UI — distinto do preto do splash PWA). |
| **Metadados** | `app/layout.tsx` — `applicationName`, `appleWebApp`, preload de `kfs-app-icon.png`, `theme-color` preto em dark mode, script inline que pinta `html`/`body` de preto em standalone. **Favicon:** `app/icon.png` / `app/apple-icon.png` (gerados, não `app/icon.tsx`); **`public/favicon.ico`** (48px, para pedidos automáticos do browser a `/favicon.ico`). |
| **Service worker** | `public/sw.js` — `install` / `activate`; listener `fetch` vazio (pass-through). Registo em produção: `components/PwaServiceWorkerRegister.tsx`. Versão actual: ver constante `SW_VERSION` no ficheiro. |
| **Instalação** | `PwaInstallProvider`, `PwaInstallHint`, `SidebarPwaInstall`, `HomePwaInstallBand` — ver `lib/pwa-install-storage.ts`, `lib/pwa-install-ui.ts`. |
| **Modo app** | `PwaDisplayMode` → `data-pwa-standalone` no `<html>`; `app/globals.css` ajusta `min-height` e fundo **preto** em `display-mode: standalone`. |
| **Middleware** | `middleware.ts` exclui `sw.js` e `manifest.webmanifest` do redirect para login. |
| **Sessão** | `AuthSessionKeepAlive`, cookies `kfs_auth_long` («Manter-me ligado»), `lib/supabase/cookie-options.ts`. Complemento: [`LoginInfinitoBoasPraticas.md`](LoginInfinitoBoasPraticas.md). |

## Cores — PWA vs UI vs Capacitor

| Contexto | Cor | Notas |
|----------|-----|--------|
| Splash / ícone PWA / manifest | `#000000` | `BRAND_ICON_BG` |
| UI autenticada (dark) | `#0b0b0b` / `#121416` | `BRAND_BG`, tokens CSS |
| Status bar Capacitor | `#121416` | `CapacitorNativeBridge` — grafite da marca |

## Pipeline de marca (ícones)

1. Colocar ou actualizar `public/brand/kfs-app-icon.png` (transparente ou preto liso).
2. `npm run generate:pwa-icons`
3. Alterar `SW_VERSION` em `public/sw.js`
4. Deploy → utilizador **remove e reinstala** a PWA (cache do splash/ícone no SO).

Scripts auxiliares: `process-brand-logo.mjs` (logotipo largo + emblema quadrado), `prepare-capacitor-assets.mjs` (lojas nativas).

## Sessão longa no telemóvel

Ver secção **Sessão web** em [`memory.md`](memory.md) e [`LoginInfinitoBoasPraticas.md`](LoginInfinitoBoasPraticas.md).

Pontos Supabase Dashboard: time-box / inactivity (plano Pro), sessão única por utilizador, intervalo de reutilização do refresh token.

## Desinstalar e voltar a instalar

- Não há API fiável de «desinstalou a PWA».
- `beforeinstallprompt` pode demorar a voltar após desinstalar (Chrome).
- `appinstalled` grava `kfs-pwa-appinstalled-at` em `localStorage` (diagnóstico).

## Testes rápidos

1. `npm run build` → `npm start` → DevTools → Application → Manifest / Service Workers.
2. Instalar no dispositivo; validar **um só preto** no splash (reinstalar após mudar manifest/ícones).
3. Lighthouse → PWA (HTTPS em produção).

## Ficheiros principais

| Tipo | Caminhos |
|------|----------|
| Tokens | `lib/brand.ts` |
| Manifest | `app/manifest.ts` |
| Layout / preload | `app/layout.tsx` |
| Splash | `components/PwaLaunchSplash.tsx`, `BrandSplashLogo.tsx`, `DashboardSplash.tsx` |
| SW | `public/sw.js` |
| Ícones | `public/icons/`, `public/brand/kfs-app-icon.png` |
| Scripts | `scripts/generate-pwa-icons.ts`, `scripts/prepare-brand-icon-source.mjs` |

---

*Índice: [`INDEX.md`](INDEX.md) · Contexto vivo: [`memory.md`](memory.md) (secções Identidade visual, Sessão web).*
