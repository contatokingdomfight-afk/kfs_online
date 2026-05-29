# Android — primeiro teste no Android Studio

> **Última revisão:** 28 maio 2026

## Pré-requisitos

1. [Android Studio](https://developer.android.com/studio) instalado (inclui Android SDK).
2. Node 20.x e dependências do repo (`npm install` já feito).
3. Ligação à internet (a app abre o **site em produção** no WebView, não o `npm run dev` local).

## 1. Sincronizar com URL de produção

Na raiz do projeto:

```bash
npm run cap:sync:prod
```

Isto grava em `android/.../capacitor.config.json` algo como:

```json
"server": { "url": "https://kingdomfight.com", ... }
```

Para outro domínio, define antes:

```bash
# PowerShell
$env:CAPACITOR_SERVER_URL="https://o-teu-dominio.com"
npm run cap:sync
```

Ou cria `.env.local` com:

```env
CAPACITOR_SERVER_URL=https://kingdomfight.com
```

## 2. Abrir o Android Studio

```bash
npm run cap:open:android
```

Atalho que faz sync + abrir:

```bash
npm run cap:android:test
```

## 3. No Android Studio

1. Aguarda o **Gradle sync** terminar (barra em baixo).
2. **Device Manager** (ícone de telemóvel) → cria ou inicia um **emulador** (ex. Pixel 6, API 34), **ou** liga um telemóvel USB com **Depuração USB** activa.
3. Selecciona o dispositivo no dropdown ao lado do botão Run.
4. Clica **Run** (▶) ou `Shift+F10`.

A app **Kingdom Fight School** deve abrir, mostrar o splash KFS e carregar o site.

## 4. O que testar

- [ ] Homepage e login (email + palavra-passe).
- [ ] **Continuar com Google** (abre browser do sistema e volta à app).
- [ ] Dashboard aluno, performance, check-in (câmara no WebView).
- [ ] Botão **voltar** do Android (navegação no histórico).
- [ ] Reabrir a app — sessão mantém-se (cookies Supabase).

## Problemas comuns

| Sintoma | O que fazer |
|--------|-------------|
| Ecrã com texto «Configure CAPACITOR_SERVER_URL…» | Correr `npm run cap:sync:prod` outra vez. |
| Página em branco | Confirmar URL no browser do PC; verificar domínio em `capacitor.config.json` em `android/app/src/main/assets/`. |
| Gradle sync falha | Android Studio → SDK Manager → instalar **Android SDK Platform 34** (ou o que o projeto pedir). |
| Emulador lento | Preferir telemóvel físico em USB. |
| Login Google não volta à app | Ver `DOCS/CAPACITOR.md` (redirect Supabase / Google Cloud). |

## Relacionado

- [`CAPACITOR.md`](CAPACITOR.md)
- [`MOBILE_APP_DISTRIBUICAO.md`](MOBILE_APP_DISTRIBUICAO.md)
