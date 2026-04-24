/**
 * Vista 3D com modelo GLB base (encaixe às proporções do rig) + fallback procedural.
 */
import * as THREE from "three";
import { ColorManagement } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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

function fitGltfModel(model: THREE.Object3D, joints: AvatarRigJoints2D): void {
  const { kk } = rigTo3(joints);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  /** GLB de teste pode ter «altura» em X ou Z; usamos a maior extensão. */
  const extent = Math.max(0.001, size.x, size.y, size.z);
  const s0 = TARGET_HEIGHT / extent;
  model.scale.setScalar(s0);
  model.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(model);
  const shoulderW = Math.abs(joints.shoulderLw.x - joints.shoulderRw.x) * kk * 0.92;
  const w = Math.max(0.001, box2.max.x - box2.min.x);
  const sx = shoulderW / w;
  model.scale.x *= sx;
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
    if (!(o instanceof THREE.Mesh) || !o.geometry) return;
    const g = o.geometry;
    if (g.getAttribute("color")) g.deleteAttribute("color");

    const old = o.material;
    const oldList = Array.isArray(old) ? old : [old];
    const newList = oldList.map(() => {
      return new THREE.MeshStandardMaterial({
        color: 0xc4b5fd,
        roughness: 0.52,
        metalness: 0.07,
        flatShading: false,
        side: THREE.DoubleSide,
      });
    });
    for (const m of oldList) (m as THREE.Material)?.dispose?.();
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
  camera.position.set(0, 0.8, 1.38);

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
    const model = gltf.scene.clone(true);
    prepareImportedModel(model);
    fitGltfModel(model, joints);
    return mountGltfViewport(container, model, joints);
  } catch {
    return mountProceduralHumanoidScene(container, joints);
  }
}
