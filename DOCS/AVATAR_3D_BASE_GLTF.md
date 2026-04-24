# Vista 3D — ficheiro base GLB

## Comportamento

- O painel tenta carregar **`/models/human-base.glb`** (pasta `public/models/` no repositório).
- O modelo é **escalado** de forma **uniforme** para altura ~1,58 unidades (igual ao manequim procedural), com heurística para **T-pose** (envergadura). **Não** se aplica escala não uniforme ao GLB com `SkinnedMesh` (quebraria o skinning no Three.js); largura de ombros da ficha pode vir numa iteração futura com morph/retarget.
- São desenhadas **linhas guia IK** (tracejadas) por cima, alinhadas ao diagrama 2D.
- Se o URL falhar (404, rede, GLB inválido), usa-se o **humanóide procedural** como fallback.

## Substituir o manequim

1. Exporta um GLB **Y-up**, de preferência um manequim humano **CC0** (ex.: [Prototyping Mannequin](https://burning-barb.itch.io/mannequin) — ver licença no download).
2. Grava como **`public/models/human-base.glb`** (substitui o ficheiro existente).
3. Faz deploy. Opcional: define **`NEXT_PUBLIC_HUMAN_BASE_GLTF_URL`** com URL absoluto para um GLB alojado noutro sítio (CDN).

## Mixamo (Adobe) como base

[Mixamo](https://www.mixamo.com/) oferece personagens e animações 3D gratuitas; a **licença e condições de uso** são da Adobe — rever o texto legal atual antes de usar em produção ou marca.

**Porque pode ser “melhor” que um placeholder técnico:** malhas pensadas para jogo, materiais **PBR** e **normais** consistentes, rig humano completo e ecossistema de animações (útil se no futuro ligarmos `AnimationMixer` à vista 3D).

**Fluxo típico para este projeto (só precisamos de GLB estático):**

1. No Mixamo, escolher um personagem (T-pose ou A-pose) e descarregar **FBX** (ex.: *FBX for Unity* / *Binary*).
2. Abrir no **Blender**, aplicar transformações se necessário, orientação **Y-up**, exportar **glTF 2.0 / `.glb`**.
3. Substituir `public/models/human-base.glb` **ou** definir `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL` com um URL absoluto para o GLB.

O carregador usa `GLTFLoader` + clone com `SkeletonUtils.clone` (`lib/humanoid-gltf-scene.ts`) para **rigged meshes** não ficarem partidos após o clone (comum com personagens Mixamo / GLB com `SkinnedMesh`).

## Ficheiro incluído no repositório (predefinição)

O `human-base.glb` em `public/models/` é o pack **[Human Models Set – Male/Female (Rigged)](https://sketchfab.com/3d-models/human-models-set-malefemale-rigged-7311fcfdc03e4234900eeced42a1e669)** (Sketchfab, autor **lzyassoul**, **CC-BY**) — ver `public/models/ATTRIBUTION-human-base.txt`. Com **várias** malhas `SkinnedMesh` do **mesmo** boneco (cabeça, corpo, etc.) mantêm-se **todas** visíveis; só se tenta esconder um **segundo rig** claramente menor (outro personagem no mesmo GLB). Escala uniforme à altura da ficha.

Alternativa histórica: **RiggedSimple** dos [glTF Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models) (CC-BY 4.0) também serviu como placeholder técnico.

## Dados da ficha

As proporções vêm do mesmo fluxo que o SVG: `formData` normalizado da última `StudentPhysicalAssessment` + `mapFormDataToAvatarMeasurements` + `buildAvatarPoseLayout` → `computeAvatarRigJoints`.
