# Vista 3D — ficheiro base GLB

## Comportamento

- O painel tenta carregar **`/models/human-base.glb`** (pasta `public/models/` no repositório).
- O modelo é **escalado** para altura ~1,58 unidades (igual ao manequim procedural) e **esticado em X** para aproximar a **largura de ombros** derivada da ficha (`computeAvatarRigJoints` / `StudentPhysicalAssessment.formData`).
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

O GLB **RiggedSimple** dos [glTF Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models) (Khronos / doado por Cesium) está licenciado sob **CC-BY 4.0** — ver `public/models/ATTRIBUTION-human-base.txt`. Serve como **placeholder técnico**; para produção convém trocar por um manequim humano CC0/CC-BY com aspeto adequado à marca, ou por um export Mixamo→Blender→GLB conforme acima.

## Dados da ficha

As proporções vêm do mesmo fluxo que o SVG: `formData` normalizado da última `StudentPhysicalAssessment` + `mapFormDataToAvatarMeasurements` + `buildAvatarPoseLayout` → `computeAvatarRigJoints`.
