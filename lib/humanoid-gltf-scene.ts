/**
 * Vista 3D com modelo GLB base (encaixe às proporções do rig) + fallback procedural.
 */
import * as THREE from "three";
import { ColorManagement } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinnedHierarchy } from "three/addons/utils/SkeletonUtils.js";

ColorManagement.enabled = true;
import type { AvatarRigJoints2D } from "@/lib/avatar-rig-joints";
import { mountProceduralHumanoidScene, type HumanoidMountHandle } from "@/lib/procedural-humanoid-scene";

type Vec3 = readonly [number, number, number];

const DEFAULT_GLTF = "/models/human-base.glb";
/** GLBs separados (homem / mulher) em `public/models/` — ver `DOCS/AVATAR_3D_BASE_GLTF.md`. */
const DEFAULT_MALE_GLTF = "/models/human-base-male.glb";
const DEFAULT_FEMALE_GLTF = "/models/human-base-female.glb";

function trimPublicEnv(key: string): string {
  if (typeof process === "undefined") return "";
  return process.env[key]?.trim() ?? "";
}

function dedupeUrlChain(urls: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    const s = u.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

const TARGET_HEIGHT = 1.58;
/** Altura alvo do GLB no mundo (ligeiramente menor que o rig 2D para caber no painel). */
const GLB_FIT_HEIGHT = 1.12;
const HALF_PI = Math.PI / 2;

function rigTo3(joints: AvatarRigJoints2D) {
  const headTop = joints.headCy - joints.headRy;
  const span = Math.max(110, joints.footBaseline - headTop);
  const kk = TARGET_HEIGHT / span;
  const fb = joints.footBaseline;
  const to3 = (x: number, y: number, zOff = 0): Vec3 => [(x - joints.cx) * kk, (fb - y) * kk, zOff] as const;
  return { to3, kk };
}

function addIkDash(root: THREE.Group, a: Vec3, b: Vec3): void {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b], 3));
  const mat = new THREE.LineDashedMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.35,
    dashSize: 0.034,
    gapSize: 0.042,
    depthWrite: false,
  });
  const line = new THREE.LineSegments(geom, mat);
  line.computeLineDistances();
  root.add(line);
}

function addGuides(root: THREE.Group, joints: AvatarRigJoints2D, to3: ReturnType<typeof rigTo3>["to3"]): void {
  const p = joints;
  const pelvis3 = to3(p.pelvis.x, p.pelvis.y, 0);
  const ankleL3 = to3(p.ankleL.x, p.ankleL.y, 0);
  const ankleR3 = to3(p.ankleR.x, p.ankleR.y, 0);
  const wristL3 = to3(p.wristL.x, p.wristL.y, -0.02);
  const wristR3 = to3(p.wristR.x, p.wristR.y, 0.02);
  const sternum3 = to3(p.sternum.x, p.sternum.y, 0);
  addIkDash(root, pelvis3, ankleL3);
  addIkDash(root, pelvis3, ankleR3);
  addIkDash(root, ankleL3, ankleR3);
  addIkDash(root, sternum3, wristL3);
  addIkDash(root, sternum3, wristR3);
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else (m as THREE.Material | undefined)?.dispose?.();
    }
    if (obj instanceof THREE.LineSegments) {
      obj.geometry?.dispose();
      (obj.material as THREE.Material)?.dispose?.();
    }
  });
}

/** Altura «corporal» para escala: em T-pose o maior eixo pode ser a envergadura; usamos o valor médio dos três eixos como robustez. */
function bodyHeightExtent(size: THREE.Vector3): number {
  const ax = Math.max(1e-4, size.x);
  const ay = Math.max(1e-4, size.y);
  const az = Math.max(1e-4, size.z);
  const sorted = [ax, ay, az].sort((a, b) => a - b);
  const mid = sorted[1]!;
  const max = sorted[2]!;
  /** Se um eixo domina claramente (braços abertos), o «meio» costuma aproximar altura útil. */
  if (max > mid * 1.35) return THREE.MathUtils.clamp(mid * 1.08, max * 0.52, max * 0.98);
  return max;
}

function meshTriangleCount(mesh: THREE.Mesh): number {
  const g = mesh.geometry;
  if (!g) return 0;
  const idx = g.index;
  if (idx) return Math.max(0, Math.floor(idx.count / 3));
  const n = g.attributes.position?.count ?? 0;
  return Math.max(0, Math.floor(n / 3));
}

export type HumanoidGltfBodyHint = "auto" | "female" | "male";

/** Valor opcional em `PhysicalAssessmentFormData.humanoid3dBodyVariant`. */
export function humanoidHintFromFormVariant(v: unknown): HumanoidGltfBodyHint {
  if (v === "FEMALE") return "female";
  if (v === "MALE") return "male";
  return "auto";
}

function readEnvBodyHint(): HumanoidGltfBodyHint {
  if (typeof process === "undefined") return "auto";
  const v = process.env.NEXT_PUBLIC_HUMANOID_BODY_HINT?.trim().toLowerCase();
  if (v === "female" || v === "f") return "female";
  if (v === "male" || v === "m") return "male";
  return "auto";
}

/**
 * Lista de URLs a tentar por ordem.
 * - Só `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL` (sem M/F): legado + fallback `human-base.glb`.
 * - Caso contrário: `human-base-male.glb` / `human-base-female.glb` (ou env) consoante hint/env, depois `human-base.glb`.
 */
function buildGltfUrlAttemptList(modelUrlOverride: string | undefined, bodyHint: HumanoidGltfBodyHint): string[] {
  const explicit = modelUrlOverride?.trim();
  if (explicit) return [explicit];

  const legacySingle = trimPublicEnv("NEXT_PUBLIC_HUMAN_BASE_GLTF_URL");
  const maleOverride = trimPublicEnv("NEXT_PUBLIC_HUMAN_BASE_GLTF_URL_MALE");
  const femaleOverride = trimPublicEnv("NEXT_PUBLIC_HUMAN_BASE_GLTF_URL_FEMALE");

  if (legacySingle && !maleOverride && !femaleOverride) {
    return dedupeUrlChain([legacySingle, DEFAULT_GLTF]);
  }

  const maleUrl = maleOverride || DEFAULT_MALE_GLTF;
  const femaleUrl = femaleOverride || DEFAULT_FEMALE_GLTF;
  const effective = bodyHint !== "auto" ? bodyHint : readEnvBodyHint();
  const primary = effective === "female" ? femaleUrl : maleUrl;

  return dedupeUrlChain([primary, DEFAULT_GLTF]);
}

function collectHierarchyNames(obj: THREE.Object3D): string {
  const parts: string[] = [];
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.name?.trim()) parts.push(o.name.toLowerCase());
    o = o.parent;
  }
  return parts.join(" ");
}

function nameFemaleScore(s: string): number {
  const t = s.toLowerCase();
  if (t.includes("female") || t.includes("woman") || t.includes("mulher") || t.includes("girl")) return 4;
  if ((t.includes("male") && !t.includes("female")) || t.includes("homem")) return -2;
  return 0;
}

function nameMaleScore(s: string): number {
  const t = s.toLowerCase();
  if ((t.includes("male") && !t.includes("female")) || t.includes("homem") || /\bman\b/.test(t)) return 4;
  if (t.includes("female") || t.includes("woman") || t.includes("mulher")) return -2;
  return 0;
}

function nameHintsForMesh(mesh: THREE.SkinnedMesh): { f: number; m: number } {
  const s = collectHierarchyNames(mesh);
  return { f: nameFemaleScore(s), m: nameMaleScore(s) };
}

type SkelGroup = {
  id: string;
  meshes: THREE.SkinnedMesh[];
  tris: number;
  f: number;
  m: number;
};

function comparePrimarySkelGroup(a: SkelGroup, b: SkelGroup, hint: HumanoidGltfBodyHint, envHint: HumanoidGltfBodyHint): number {
  const effective: HumanoidGltfBodyHint =
    hint !== "auto" ? hint : envHint !== "auto" ? envHint : "auto";

  if (effective === "female") {
    const d = b.f - b.m - (a.f - a.m);
    if (d !== 0) return d;
    if (b.tris !== a.tris) return b.tris - a.tris;
    return a.id.localeCompare(b.id);
  }
  if (effective === "male") {
    const d = b.m - b.f - (a.m - a.f);
    if (d !== 0) return d;
    if (b.tris !== a.tris) return b.tris - a.tris;
    return a.id.localeCompare(b.id);
  }

  const maxTr = Math.max(a.tris, b.tris, 1);
  const triDiff = b.tris - a.tris;
  if (Math.abs(triDiff) > maxTr * 0.06) return triDiff;

  const nameSignal = Math.max(b.f, b.m) - Math.max(a.f, a.m);
  if (nameSignal !== 0) return nameSignal;

  if (triDiff !== 0) return triDiff;
  return a.id.localeCompare(b.id);
}

/**
 * GLBs com **vários rigs** (ex.: pack masculino + feminino): mantém **um** esqueleto visível.
 * `hint` vem da ficha (`humanoid3dBodyVariant`); `NEXT_PUBLIC_HUMANOID_BODY_HINT` reforça o modo `auto`.
 */
function selectPrimarySkinnedGroupAndHideOthers(root: THREE.Object3D, hint: HumanoidGltfBodyHint): void {
  const skinned: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) skinned.push(o);
  });
  if (skinned.length <= 1) return;

  const bySkel = new Map<string, SkelGroup>();
  for (const mesh of skinned) {
    const id = mesh.skeleton?.uuid ?? mesh.uuid;
    const g = bySkel.get(id) ?? { id, meshes: [], tris: 0, f: 0, m: 0 };
    g.meshes.push(mesh);
    g.tris += meshTriangleCount(mesh);
    const h = nameHintsForMesh(mesh);
    g.f = Math.max(g.f, h.f);
    g.m = Math.max(g.m, h.m);
    bySkel.set(id, g);
  }
  if (bySkel.size <= 1) return;

  const envHint = readEnvBodyHint();
  const groups = [...bySkel.values()].sort((a, b) => comparePrimarySkelGroup(a, b, hint, envHint));
  const keepId = groups[0]!.id;
  for (const g of groups) {
    if (g.id === keepId) continue;
    for (const m of g.meshes) m.visible = false;
  }
}

function applySkinnedBindPose(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh && o.skeleton) {
      o.skeleton.pose();
      o.updateMatrixWorld(true);
    }
  });
}

/**
 * Escolhe rotação Y ∈ {0, ±90°, 180°} para maximizar largura em X vs profundidade em Z
 * (câmara olha ao longo de −Z: corpo «de frente» costuma ter caixa mais larga em X que em Z).
 */
function orientModelFacingCamera(model: THREE.Object3D): void {
  let bestRy = 0;
  let bestScore = -Infinity;
  for (const ry of [0, HALF_PI, Math.PI, -HALF_PI]) {
    model.rotation.set(0, ry, 0);
    model.updateMatrixWorld(true);
    const s = new THREE.Vector3();
    new THREE.Box3().setFromObject(model).getSize(s);
    const score = s.x / Math.max(0.06, s.z);
    if (score > bestScore) {
      bestScore = score;
      bestRy = ry;
    }
  }
  model.rotation.set(0, bestRy, 0);
}

function fitGltfModel(model: THREE.Object3D, _joints: AvatarRigJoints2D): void {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  orientModelFacingCamera(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const extent = bodyHeightExtent(size);
  if (extent < 0.02 || extent > 24) {
    throw new Error(`humanoid gltf: caixa inválida (extent=${extent})`);
  }
  /**
   * Escala **uniforme** apenas: escala não uniforme no pai de `SkinnedMesh` quebra a matriz de skinning
   * no Three.js (malhas «desmontadas» / cabeça separada do tronco).
   */
  const s0 = GLB_FIT_HEIGHT / extent;
  model.scale.setScalar(s0);
  model.updateMatrixWorld(true);
  const box3 = new THREE.Box3().setFromObject(model);
  const cx = (box3.min.x + box3.max.x) / 2;
  model.position.x -= cx;
  model.position.y -= box3.min.y;
}

/**
 * RiggedSimple e similares usam MeshBasicMaterial + vertexColors (ex. verde) — ignoram luzes.
 * Remove cores por vértice, linhas de debug e normaliza para MeshStandardMaterial iluminado.
 */
function prepareImportedModel(root: THREE.Object3D): void {
  const removeList: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Line || o instanceof THREE.LineSegments || o instanceof THREE.Points) {
      removeList.push(o);
    }
  });
  for (const o of removeList) {
    o.parent?.remove(o);
    if (o instanceof THREE.Line || o instanceof THREE.LineSegments || o instanceof THREE.Points) {
      o.geometry?.dispose();
      const m = o.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose?.();
    }
  }

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || !o.visible || !o.geometry) return;
    const g = o.geometry;
    if (g.getAttribute("color")) g.deleteAttribute("color");

    const old = o.material;
    const oldList = Array.isArray(old) ? old : [old];
    const newList = oldList.map((m) => {
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        m.vertexColors = false;
        return m;
      }
      if (m instanceof THREE.MeshBasicMaterial || m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshPhongMaterial) {
        const basic = m as THREE.MeshBasicMaterial;
        const map = "map" in basic && basic.map ? basic.map : null;
        (m as THREE.Material).dispose?.();
        return new THREE.MeshStandardMaterial({
          color: basic.color?.getHex() ?? 0xc4b5fd,
          map,
          roughness: 0.55,
          metalness: 0.06,
          flatShading: false,
          side: THREE.DoubleSide,
        });
      }
      (m as THREE.Material).dispose?.();
      return new THREE.MeshStandardMaterial({
        color: 0xc4b5fd,
        roughness: 0.52,
        metalness: 0.07,
        flatShading: false,
        side: THREE.DoubleSide,
      });
    });
    o.material = newList.length === 1 ? newList[0]! : newList;
  });
}

function mountGltfViewport(container: HTMLElement, modelRoot: THREE.Object3D, joints: AvatarRigJoints2D): HumanoidMountHandle {
  while (container.firstChild) container.removeChild(container.firstChild);

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  const { to3 } = rigTo3(joints);
  world.add(modelRoot);
  addGuides(world, joints, to3);
  scene.add(world);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.06, 32);
  const lookY = 0.58;
  camera.position.set(0, 0.62, 2.55);
  camera.lookAt(0, lookY, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    stencil: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  if ("outputColorSpace" in renderer) {
    (renderer as THREE.WebGLRenderer & { outputColorSpace: THREE.ColorSpace }).outputColorSpace =
      THREE.SRGBColorSpace;
  }
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  scene.background = null;
  const amb = new THREE.AmbientLight(0xf8fafc, 0.55);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x475569, 0.42);
  scene.add(hemi);
  const d1 = new THREE.DirectionalLight(0xffffff, 0.55);
  d1.position.set(1.15, 2.35, 1.55);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xe2e8f0, 0.22);
  d2.position.set(-1.4, 0.9, -0.85);
  scene.add(d2);

  const setSize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.lookAt(0, lookY, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
  };

  setSize();
  const ro = new ResizeObserver(() => setSize());
  ro.observe(container);

  return {
    destroy: () => {
      ro.disconnect();
      disposeObject3D(world);
      scene.remove(world);
      renderer.dispose();
      canvas.remove();
    },
  };
}

/**
 * Carrega GLB por género (`human-base-male.glb` / `human-base-female.glb` em `public/models/`) ou legado único
 * (`NEXT_PUBLIC_HUMAN_BASE_GLTF_URL` / `human-base.glb`). Várias URLs são tentadas em cadeia; se todas falharem, procedural.
 */
export async function mountHumanoidGltfOrProcedural(
  container: HTMLElement,
  joints: AvatarRigJoints2D,
  modelUrl?: string,
  bodyHint: HumanoidGltfBodyHint = "auto"
): Promise<HumanoidMountHandle> {
  const attempts = buildGltfUrlAttemptList(modelUrl, bodyHint);
  const loader = new GLTFLoader();
  let lastErr: unknown;

  for (const url of attempts) {
    try {
      const gltf = await new Promise<{ scene: THREE.Object3D }>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      /** `Object3D.clone(true)` não religa ossos em todos os GLBs; Mixamo / rigged dependem disto. */
      const model = cloneSkinnedHierarchy(gltf.scene);
      selectPrimarySkinnedGroupAndHideOthers(model, bodyHint);
      prepareImportedModel(model);
      applySkinnedBindPose(model);
      fitGltfModel(model, joints);
      return mountGltfViewport(container, model, joints);
    } catch (err) {
      lastErr = err;
      if (process.env.NODE_ENV === "development") {
        console.warn("[humanoid 3d] GLB falhou, a tentar seguinte URL:", url, err);
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("[humanoid 3d] Todas as URLs GLB falharam, a usar manequim procedural:", attempts, lastErr);
  }
  return mountProceduralHumanoidScene(container, joints);
}
