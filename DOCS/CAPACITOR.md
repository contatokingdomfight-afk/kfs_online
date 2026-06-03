# Capacitor — app nativa (Android / iOS)

> **Última revisão:** 22 maio 2026 — OAuth, deep links, ícones/splash KFS. **Cores:** splash/ícones nativos usam grafite `#121416` na status bar; a PWA web usa preto `#000000` no manifest — ver [`PWA.md`](PWA.md).

## Arquitectura

O binário nativo é um **WebView** que carrega o **mesmo site** Next.js em produção (`server.url`). Não há `next export` estático.

| Componente | Ficheiro |
|------------|----------|
| Config | `capacitor.config.ts` |
| Bridge (status bar, voltar, OAuth) | `components/CapacitorNativeBridge.tsx` |
| Detecção nativa | `lib/capacitor-native.ts` |
| OAuth Google | `lib/capacitor-open-oauth.ts` + login/registo |
| Ícones / splash | `npm run generate:capacitor-assets` → `android/`, `ios/` |

**App ID:** `com.kingdomfight.school`

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `CAPACITOR_SERVER_URL` | URL que o WebView abre (prioridade) |
| `NEXT_PUBLIC_SITE_URL` | Fallback (ex. `https://kingdomfight.com`) |

Definir **antes** de `npm run cap:sync` em builds que apontam a produção.

## Comandos (quando fores testar ou publicar)

**Primeiro teste Android:** guia passo a passo em [`ANDROID_PRIMEIRO_TESTE.md`](ANDROID_PRIMEIRO_TESTE.md).

```bash
# Sync com URL de produção (https://kingdomfight.com por defeito)
npm run cap:sync:prod

# Abrir Android Studio
npm run cap:open:android

# Atalho: sync prod + abrir Android Studio
npm run cap:android:test
```

```bash
# Regenerar ícones/splash KFS (opcional, após mudar logo)
npm run generate:capacitor-assets

# Sincronizar (usa CAPACITOR_SERVER_URL / .env se definido)
npm run cap:sync

npm run cap:open:ios   # requer macOS
```

## Login Google na app

1. O utilizador toca em «Continuar com Google».
2. Na app nativa abre-se o **browser do sistema** (`@capacitor/browser`), não só o WebView.
3. Após autenticação, o redirect para `https://<domínio>/auth/callback?...` pode reabrir a app (intent Android / URL scheme iOS).
4. `CapacitorNativeBridge` fecha o browser e navega o WebView para o callback (sessão Supabase igual ao site).

**Supabase → Authentication → Redirect URLs:** manter `https://kingdomfight.com/auth/callback**` (e domínios de preview se usados).

**Google Cloud Console:** authorized redirect URIs do Supabase; origens JavaScript com o domínio web.

Scheme opcional (futuro): `com.kingdomfight.school://auth/callback` — já registado no Android/iOS; só activar no Supabase se o fluxo https falhar.

## Deep links (Android)

`AndroidManifest.xml` inclui `https://kingdomfight.com/auth/callback` (e `www`). App Links verificados exigem ficheiro `assetlinks.json` no domínio quando fores publicar na Play Store.

## Pendências

- [ ] `assetlinks.json` no domínio (Android App Links)
- [ ] Build assinado AAB/APK e IPA (Android Studio / Xcode / CI)
- [ ] Contas Play Console e Apple Developer
- [ ] Push (`@capacitor/push-notifications` + roadmap)
- [ ] Política de privacidade e textos das lojas

## Relacionado

- [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md)
- [`PWA.md`](PWA.md)
- [`ROADMAP_Plataforma_KFS.md`](ROADMAP_Plataforma_KFS.md)
