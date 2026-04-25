# Silhueta corporal 2D ilustrativa — especificação e pipeline

> **Última revisão:** 22 abril 2026.  
> **Contexto:** ficha de anamnese / avaliação física (secção 6.4) em `StudentPhysicalAssessment.formData`.  
> **Índice geral:** [`INDEX.md`](INDEX.md) · **Memória:** [`memory.md`](memory.md) (performance, carrossel) · **3D GLB:** [`AVATAR_3D_BASE_GLTF.md`](AVATAR_3D_BASE_GLTF.md)

Este documento fecha as **fases 0–4** do trabalho da silhueta: inventário campo ↔ corpo, regras de produto, pipeline único, critérios de aceite, regressão manual e referências de código.

---

## 1. Decisão de produto (vista 2D vs 3D)

| Decisão | Estado |
|--------|--------|
| Vista **principal** na app e no carrossel de performance | **SVG 2D** (`Avatar` → `Body` + pose + equipamento). Por defeito **Vitruviano** (`poseTag "star"`): braços horizontais, pernas em aberto moderado, membros superiores como linhas rectas até às mãos. |
| **WebGL / modelo 3D** (`Humanoid3DPanel`) | **Opcional**: chips «Silhueta 2D» / «Modelo 3D» quando `show3dViewOption` / `allowLazyHumanoid3d`; chunk 3D carregado só ao escolher 3D (`next/dynamic`, `ssr: false`) |
| Natureza dos dados | **Ilustrativo**, não clínico, não foto do aluno; copy em i18n e legendas |

Resumos compactos que **não** passam `show3dViewOption` mantêm **apenas 2D**.

---

## 2. Regra de «ficha mínima» e silhueta neutra

| Estado | Condição | UI |
|--------|-----------|-----|
| **Personalizada** | `hasIllustrativeAnthropometry(formData)` = **≥ 2** valores numéricos &gt; 0 entre o conjunto listado em `lib/illustrative-body-silhouette.ts` | Medidas mapeadas → escalas → silhueta **diferente** da neutra (proporções variam) |
| **Neutra com ficha** | Ficha existe mas **&lt; 2** medidas desse conjunto (ou só anamnese) | `neutralReference` + copy explicativa; corpo com referência genérica |
| **Sem ficha na plataforma** | Sem linha / contexto de conquistas conforme `buildPhysicalAvatarCarouselForStudentView` | Silhueta de referência + texto a pedir registo |

### Critérios de aceite (verificáveis)

1. Com **≥ 2** medidas válidas da lista, `hasIllustrativeAnthropometry` é `true` e o 2.º painel do carrossel usa **dados normalizados** da ficha no avatar (não esconder silhueta por parse JSON falho — usar `normalizePhysicalFormDataJson`).
2. Com **0 ou 1** medida, `hasIllustrativeAnthropometry` é `false`: não se mostra silhueta «personalizada» como se fosse único número; vê-se fluxo neutro / copy adequada.
3. **Sem dados de antropometria**, a silhueta **não** deve ser confundível com uma reconstrução anatómica: permanece **genérica** (proporções de referência + texto).
4. **Altura / peso** (ficha ou `StudentProfile` via `bodyScaleFromProfile`) influenciam **altura** e **bulk** (`bulkFactor`) no motor modular; não substituem circunferências para forma do torso.

---

## 3. Dois motores 2D (importante para manutenção)

| Motor | Onde | Uso na app |
|-------|------|------------|
| **A — Avatar modular** | `mapFormDataToAvatarMeasurements` → `buildBodyScaleFactors` → `buildAvatarPoseLayout` → `Body.tsx` | `IllustrativeBodyAvatar`, carrossel, perfil atleta, vista 3D (mesmas escalas no GLB) |
| **B — Polígono compacto** | `buildSilhouetteParts` em `lib/illustrative-body-silhouette.ts` (função `scale` com **raiz** e clamps próprios) | Resumos / silhuetas mais simples quando só aquele desenho é necessário |

Alterações visuais «próximo do real» no **carrossel e avatar principal** devem ir para o **motor A** (`components/avatar/avatar-utils.ts`, `Body.tsx`, `build-avatar-layout.ts`). O motor B segue regras próprias; alinhar só quando houver requisito explícito de paridade.

A função `computeGlobalBodyScale` no mesmo ficheiro do motor B é um **helper de escala global** (≈ 0,86–1,14) pensado para ajuste fino por altura/peso; **a vista `Avatar` modular** usa sobretudo altura/peso já em `AvatarMeasurements` + `bulkFactor` em `avatar-utils`. Evoluções futuras podem unificar; até lá, documentar onde cada um se aplica.

---

## 4. Inventário: campo da ficha → região / factor (motor A)

Mapeamento em código: `mapFormDataToAvatarMeasurements` (`components/avatar/avatar-utils.ts`).  
Escalas por medida: `buildBodyScaleFactors` + `scaleMeasurement` (expoente e min/max **por região**).  
Geometria do torso: `Body.tsx` (incl. ajuste ligeiro **cintura–anca** no contorno).

| Campo(s) `formData` | Factor / uso no SVG modular | Notas |
|---------------------|----------------------------|--------|
| `breadthShoulderCm` | `shoulder` (ref. **biaquatorial** 41 cm) | Se preenchido, `shouldersAreBiacromialCm`; senão ombro vem de estimativas (pescoço, tórax, antebraço) |
| `circChestCm` | `chest` | Largura ombros/torso (`shW` com termo `chest`) |
| `circAbdomenCm` | `waist` | Cintura no path do torso (+ ajuste WHR) |
| `circHipCm` | `hip` | Anca no torso e pose (`halfHipW`) |
| `circThighLeftCm` / `circThighRightCm` | `thigh` (média dos lados) | Coxa / joelho |
| `circCalfLeftCm` / `circCalfRightCm` | `calf` (média) | Gemelos |
| `circArmLeftCm` / `circArmRightCm` + `circBicepsLeftCm` / `circBicepsRightCm` | `arm` | **Mistura** 55 % braço + 45 % bíceps se ambos; só bíceps → × 1,08 como proxy |
| `lenLegInseamLeftCm` / `lenLegInseamRightCm` | `legInseam` | Comprimento perna vs altura |
| `heightCm` ou perfil `heightCm` | `height` | Cabeça/torso/perna em altura; prioridade da ficha sobre perfil |
| `weightKg` ou perfil `weightKg` | `bulk` via `bulkFactor` | Volume suave do torso (com altura) |

**Campos que contam para ≥ 2** mas não têm coluna dedicada no motor A** (só indiretos ou motor B):** por exemplo `circNeckCm`, `circForearm*`, `lenArmShoulderFingertip*`, `footLengthCm`, `circHeadCm` — entram na **contagem** e em **estimativas de ombro** ou no motor B; ver código.

---

## 5. Prioridades e «pesos» (filosofia)

1. **Torso (cintura / anca / tórax)** — maior impacto visual na silhueta de frente; expoentes de `scaleMeasurement` ligeiramente mais altos em cintura/anca para ler melhor WHR (sempre dentro de clamps).
2. **Ombros** — medida direta biaquatorial preferível; senão heurísticas a partir de pescoço/tórax/antebraço.
3. **Membros** — braço (com bíceps), coxa, gêmeo, entrepé: escalas independentes com clamps para evitar «agulhas» ou distorção extrema.
4. **Altura e peso** — ajuste global de estatura e `bulk`; não duplicar efeito clínico.

---

## 6. Pipeline único (fase 1)

Função exportada: **`formDataProfileToAvatarScales`** em `lib/illustrative-body-2d-pipeline.ts`.

```text
Partial<PhysicalAssessmentFormData> + perfil opcional (altura/peso)
  → mapFormDataToAvatarMeasurements
  → buildBodyScaleFactors
  → computeGlobalBodyScale (altura/peso nas medidas)
  → { measurements, scales, globalEnvelopeScale }
```

`globalEnvelopeScale` expõe o helper do **motor B** para comparação e ferramentas (ex. playground `/dev/silhueta-2d`); o desenho do **motor A** no produto continua a basear-se em `scales` por região (evitar duplicar escala de altura no mesmo eixo).

`IllustrativeBodyAvatar` obtém `measurements` através deste pipeline (neutral: `fd` vazio + mesmo perfil).  
`buildAvatarPoseLayout` continua a receber `measurements` e a devolver `pose` + as mesmas `scales`.

Testes: `lib/illustrative-body-2d-pipeline.test.ts` e `lib/illustrative-body-silhouette.test.ts` (Vitest) — casos mínimo, neutro com perfil, ficha rica (clamps), `normalizePhysicalFormDataJson`, `computeGlobalBodyScale`.

---

## 7. Rig técnico e 3D

- **`TechnicalRigSvg`** e **`lib/avatar-rig-joints.ts`**: mesmos `BodyScaleFactors` e `PoseLayout` que o avatar ilustrativo; alinhamento ao viewBox / geometria descrito nos comentários dos ficheiros. Alterar joints com o **mesmo** par `scales` + `pose` que o 2D.
- **3D:** `Humanoid3DPanel` + cena Three.js; variante GLB `humanoid3dBodyVariant` + env — ver `AVATAR_3D_BASE_GLTF.md`.

---

## 8. Integração na UI (fase 2) — checklist rápido

- [x] `IllustrativeBodyAvatar` — 2D por defeito, 3D opcional, `neutralReference`, legendas i18n.
- [x] `PerformanceRadarAvatarCarousel` + `buildPhysicalAvatarCarouselForStudentView`.
- [x] Outros ecrãs que já importam o componente (resumo ficha, atleta, etc.).

---

## 9. Polimento, performance, acessibilidade (fase 3)

| Tema | Implementação |
|------|----------------|
| **Performance** | `useMemo` em medidas e `buildAvatarPoseLayout` dentro de `IllustrativeBodyAvatar`. |
| **Responsivo** | `max-w-[min(280px,92vw)]`, `clamp` em tipografia de legenda. |
| **Acessibilidade** | Quando o ecrã fornece `silhouetteFigureAria` / `figureAriaLabel`, a figura (2D/3D + chips) fica dentro de um contentor `role="img"` com esse texto; o SVG interno mantém-se decorativo (`aria-hidden`) para não duplicar leitores. |

### Checklist manual de regressão

1. **Performance** — aluno com ficha **≥ 2** medidas: 2.º painel personalizado; deslizar entre radar e silhueta; se 3D ativo, alternar 2D/3D sem erro WebGL.
2. **Performance** — ficha sem antropometria: silhueta **neutra** + copy coerente.
3. **Performance** — sem ficha: referência + texto «sem ficha» (e variante **coach** na vista coach).
4. **Anomalia** — plataforma com ficha mas `formData` vazio: mensagem de «detalhes não carregaram», não tratar como «sem ficha».
5. **Contraste / zoom** — legenda legível em tema claro e escuro; largura não estoura em mobile estreito.
6. **Leitor de ecrã** — região do carrossel com `aria-label`; figura com `role="img"` quando há etiqueta dedicada (**performance**, **resumo avaliação física** do aluno, **ficha do atleta** coach — i18n `perfAvatarFigureAria`).

---

## 10. Referência de ficheiros

| Ficheiro | Responsabilidade |
|----------|------------------|
| `lib/illustrative-body-2d-pipeline.ts` | Pipeline documentado ficha + perfil → escalas + `globalEnvelopeScale` |
| `lib/illustrative-body-2d-pipeline.test.ts` | Vitest: antropometria mínima, clamps, JSON |
| `lib/illustrative-body-silhouette.test.ts` | Vitest: `computeGlobalBodyScale` |
| `lib/illustrative-body-silhouette.ts` | `normalizePhysicalFormDataJson`, `hasIllustrativeAnthropometry`, motor B, `computeGlobalBodyScale` |
| `app/dev/silhueta-2d/*` | Playground dev: motor A vs B, JSON de exemplo (404 em `VERCEL_ENV=production`; `middleware` idem) |
| `middleware.ts` | Bloqueio `/dev/*` em produção na Vercel |
| `e2e/dev-silhouette.spec.ts` | Playwright (opcional): `npm run test:e2e` com app a correr |
| `playwright.config.ts` | Configuração Playwright |
| `components/avatar/avatar-utils.ts` | `mapFormDataToAvatarMeasurements`, `REF`, `scaleMeasurement`, `buildBodyScaleFactors`, `bulkFactor` |
| `components/avatar/Body.tsx` | Paths do torso, pernas, braços |
| `components/avatar/build-avatar-layout.ts` | `buildAvatarPoseLayout` |
| `components/avatar/Avatar.tsx` | Composição SVG modular |
| `components/avatar/TechnicalRigSvg.tsx` | Vista técnica 2D |
| `lib/avatar-rig-joints.ts` | Pontos 2D do rig |
| `components/IllustrativeBodyAvatar.tsx` | Vista aluno: legendas, 2D/3D, memo, `role="img"` opcional |
| `lib/build-performance-physical-carousel.ts` | Payload do carrossel + `swipeHint`, labels i18n |
| `components/fighter/PerformanceRadarAvatarCarousel.tsx` | Carrossel radar + silhueta |
| `lib/i18n/messages.ts` | `perfAvatarFigureAria`, hints, captions |

---

## 11. Roadmap relacionado

Ver **`ROADMAP_Plataforma_KFS.md`** § **2c** (antropometria, avatar MVP, privacidade, futuro «e se…» / metas).

---

## 12. Ferramentas opcionais (pós‑MVP deste doc)

| Ferramenta | Uso |
|------------|-----|
| **`/dev/silhueta-2d`** | Comparação lado a lado motor A (`IllustrativeBodyAvatar`) vs motor B (`SilhouetteMotorBPreview`), edição de JSON, leitura de `globalEnvelopeScale` e `scales`. |
| **`npm run test:e2e`** | Playwright: smoke na rota dev (requer `npm run dev` noutro terminal ou `PLAYWRIGHT_BASE_URL`; instalar browsers com `npx playwright install` na primeira vez). |
