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

## Ficheiro incluído no repositório (predefinição)

O GLB **RiggedSimple** dos [glTF Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models) (Khronos / doado por Cesium) está licenciado sob **CC-BY 4.0** — ver `public/models/ATTRIBUTION-human-base.txt`. Serve como **placeholder técnico**; para produção convém trocar por um manequim humano CC0/CC-BY com aspeto adequado à marca.

## Dados da ficha

As proporções vêm do mesmo fluxo que o SVG: `formData` normalizado da última `StudentPhysicalAssessment` + `mapFormDataToAvatarMeasurements` + `buildAvatarPoseLayout` → `computeAvatarRigJoints`.
