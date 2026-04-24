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
const TARGET_HEIGHT = 1.58;

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

/**
 * Packs com **dois personagens** (dois rigs distintos): após `SkeletonUtils.clone` cada `SkinnedMesh`
 * tem o seu próprio `Skeleton`, por isso **não** podemos esconder «o segundo por triângulos» — isso
 * cortava cabeça/mãos quando eram malhas separadas do **mesmo** boneco.
 * Aqui só escondemos grupos que claramente são um **segundo corpo** (outro esqueleto com muito menos geometria).
 */
function hideSecondaryCharacterRigsIfObvious(root: THREE.Object3D): void {
  const skinned: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) skinned.push(o);
  });
  if (skinned.length <= 1) return;

  const bySkel = new Map<string, { meshes: THREE.SkinnedMesh[]; tris: number }>();
  for (const m of skinned) {
    const id = m.skeleton?.uuid ?? m.uuid;
    const g = bySkel.get(id) ?? { meshes: [], tris: 0 };
    g.meshes.push(m);
    g.tris += meshTriangleCount(m);
    bySkel.set(id, g);
  }
  if (bySkel.size <= 1) return;

  const groups = [...bySkel.values()].sort((a, b) => b.tris - a.tris);
  const primary = groups[0]!;
  const secondary = groups[1]!;
  /** Só esconder o «extra» se for claramente um segundo rig (menos de ~18 % dos triângulos do principal). */
  if (secondary.tris >= primary.tris * 0.18) return;
  for (const m of secondary.meshes) {
    m.visible = false;
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

function fitGltfModel(model: THREE.Object3D, _joints: AvatarRigJoints2D): void {
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
   * Largura de ombros da ficha fica para uma futura morph/retarget; aqui priorizamos corpo íntegro.
   */
  const s0 = TARGET_HEIGHT / extent;
  model.scale.setScalar(s0);
  model.updateMatrixWorld(true);
  const box3 = new THREE.Box3().setFromObject(model);
  const sz3 = box3.getSize(new THREE.Vector3());
  /** Se a malha ficou quase um plano na profundidade, rodar 90° para a câmara (+Z) ver o corpo de frente. */
  if (sz3.z < sz3.x * 0.4 || sz3.z < sz3.y * 0.12) {
    model.rotation.y += Math.PI / 2;
    model.updateMatrixWorld(true);
    const box4 = new THREE.Box3().setFromObject(model);
    const cx4 = (box4.min.x + box4.max.x) / 2;
    model.position.x -= cx4;
    model.position.y -= box4.min.y;
    return;
  }
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

  const camera = new THREE.PerspectiveCamera(40, 1, 0.08, 22);
  const lookY = TARGET_HEIGHT * 0.44;
  camera.position.set(0, 0.78, 1.42);
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
 * Tenta carregar `modelUrl` (por defeito `/models/human-base.glb`); se falhar, usa o humanóide procedural.
 * `NEXT_PUBLIC_HUMAN_BASE_GLTF_URL` sobrepõe o URL (CDN próprio, etc.).
 */
export async function mountHumanoidGltfOrProcedural(
  container: HTMLElement,
  joints: AvatarRigJoints2D,
  modelUrl?: string
): Promise<HumanoidMountHandle> {
  const url =
    modelUrl?.trim() ||
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_HUMAN_BASE_GLTF_URL?.trim() : "") ||
    DEFAULT_GLTF;
  try {
    const loader = new GLTFLoader();
    const gltf = await new Promise<{ scene: THREE.Object3D }>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    /** `Object3D.clone(true)` não religa ossos em todos os GLBs; Mixamo / rigged dependem disto. */
    const model = cloneSkinnedHierarchy(gltf.scene);
    hideSecondaryCharacterRigsIfObvious(model);
    prepareImportedModel(model);
    applySkinnedBindPose(model);
    fitGltfModel(model, joints);
    return mountGltfViewport(container, model, joints);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[humanoid 3d] GLB falhou, a usar manequim procedural:", url, err);
    }
    return mountProceduralHumanoidScene(container, joints);
  }
}
