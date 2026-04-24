# Vista 3D — ficheiros base GLB

## Comportamento

- O painel carrega **dois GLBs opcionais** em `public/models/`:
  - **`human-base-male.glb`** — homem (predefinição quando o hint é `auto` e o env não for `female`).
  - **`human-base-female.glb`** — mulher.
- A escolha do ficheiro segue: `humanoid3dBodyVariant` (`FEMALE` / `MALE`) no `formData` da ficha → `NEXT_PUBLIC_HUMANOID_BODY_HINT` (`female`/`f`, `male`/`m`) → em `auto` sem env, **masculino**.
- **Cadeia de fallback** (por ordem): URL primário (M ou F) → **`/models/human-base.glb`** (pack legado único, se existir) → **humanóide procedural** se tudo falhar (404, rede, GLB inválido).
- O modelo é **escalado** de forma **uniforme** (ver `lib/humanoid-gltf-scene.ts`); **não** se aplica escala não uniforme a `SkinnedMesh`. Linhas guia IK alinham-se ao diagrama 2D.
- GLBs com **mais de um rig** no mesmo ficheiro: mantém-se um esqueleto visível (hint + heurística por nomes/triângulos). Com **um GLB por género**, este passo costuma ser redundante.

## Variáveis de ambiente (opcional)

| Variável | Efeito |
|----------|--------|
| `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL` | Um único GLB para **todos** (ignora M/F em disco **só se** não definires `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL_MALE` nem `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL_FEMALE`). Útil para CDN com um ficheiro legado. |
| `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL_MALE` | URL absoluto do GLB masculino (substitui `/models/human-base-male.glb`). |
| `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL_FEMALE` | URL absoluto do GLB feminino (substitui `/models/human-base-female.glb`). |
| `NEXT_PUBLIC_HUMANOID_BODY_HINT` | `female` / `male` quando a ficha não fixa `humanoid3dBodyVariant`. |

## Substituir / atualizar os manequins

1. Exportar GLB **Y-up**, rig humano (Mixamo → Blender → glTF, etc.).
2. Gravar como **`public/models/human-base-male.glb`** e/ou **`public/models/human-base-female.glb`** (ou só um deles + manter `human-base.glb` como fallback).
3. Deploy. Opcional: URLs absolutos nas variáveis acima (CDN).

## Mixamo (Adobe) como base

[Mixamo](https://www.mixamo.com/) oferece personagens e animações; rever a **licença Adobe** antes de produção.

Fluxo típico: personagem em T-pose ou A-pose → Blender (Y-up) → exportar `.glb` → colocar em `public/models/` com os nomes acima.

O carregador usa `GLTFLoader` + `SkeletonUtils.clone` (`lib/humanoid-gltf-scene.ts`) para rigs `SkinnedMesh` não ficarem partidos após o clone.

## Atribuição / licença

- **`ATTRIBUTION-human-base-male-female.txt`** — ficheiros masculino/feminino actuais do repo (confirmar licença antes de redistribuir).
- **`ATTRIBUTION-human-base.txt`** — referência ao pack legado opcional Sketchfab *Human Models Set* (CC-BY), se usares `human-base.glb`.

## Dados da ficha

Proporções: `formData` → `mapFormDataToAvatarMeasurements` → `buildAvatarPoseLayout` → `computeAvatarRigJoints` (igual ao SVG 2D).

Campo opcional JSON **`humanoid3dBodyVariant`**: `"FEMALE"` | `"MALE"` (tipos em `lib/physical-assessment-types.ts`).
