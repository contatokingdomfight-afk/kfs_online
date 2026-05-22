# Distribuição mobile: site + PWA (sem lojas)

> **Última revisão:** 19 maio 2026 — decisão de produto: fase inicial **só pelo site**, com **botão de instalar** (PWA); lojas de aplicativos **não** na primeira fase.

## Objetivo

Disponibilizar a experiência «em app» **a partir do site**, com **instalação PWA** (atalho no ecrã inicial / ecrã de trabalho), **sem** depender de Google Play ou App Store nesta fase.

## O que é na prática

- **PWA** (Progressive Web App): manifest, service worker, ícones, mesmo login Supabase que no browser.
- **Android / Chromium:** quando o browser expõe `beforeinstallprompt`, o site pode mostrar um botão que abre o fluxo nativo de instalação.
- **iOS / Safari:** não há `beforeinstallprompt`; o utilizador instala via **Partilhar → Adicionar ao ecrã inicial** (ou equivalente). O site mostra um **modal com passos** (`lib/pwa-install-ui.ts`), alinhado a [`PWA.md`](PWA.md).

## Onde está no código

- **Homepage (público):** `components/home/HomePwaInstallBand.tsx` — faixa após o hero; visível quando a página **não** está já em modo app instalado (`lib/pwa-installed-window.ts`).
- **Área autenticada:** `SidebarPwaInstall` no menu lateral (com regras próprias de visibilidade em ecrã estreito).
- **Dica inferior:** `PwaInstallHint` em ecrãs pequenos.
- **Contexto técnico completo:** [`PWA.md`](PWA.md).

## Fase 1 (actual)

- Distribuição **100% web**: URL do site + CTA de instalação PWA.
- Sem revisão Apple/Google, sem binários nas lojas.

## Fase seguinte (opcional)

- **Capacitor** (ou wrapper semelhante) para APK / IPA e eventual publicação em **Play Store / App Store**, se fizer sentido comercial ou técnico.
- Custos e restrições (conta Apple Developer, guidelines, pipeline de build) avaliam-se nessa altura.

## Roadmap

- Resumo executivo: [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md) (linha **Mobile**).
