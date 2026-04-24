/**
 * Cena Three.js imperativa (sem @react-three/fiber) — evita duplicar React / erro #525 no Next.
 */
import * as THREE from "three";
import type { AvatarRigJoints2D } from "@/lib/avatar-rig-joints";

type Vec3 = readonly [number, number, number];

function v3(a: Vec3): THREE.Vector3 {
  return new THREE.Vector3(a[0], a[1], a[2]);
}

function buildTorsoLatheProfile(
  j: AvatarRigJoints2D,
  unit: number,
  to3: (x: number, y: number, z?: number) => Vec3
): THREE.Vector2[] {
  const wPelvis = Math.max(Math.abs(j.hipL0.x - j.cx), Math.abs(j.hipR0.x - j.cx)) * unit * 1.02;
  const wShoulder = Math.abs(j.shoulderLw.x - j.shoulderRw.x) * 0.5 * unit * 0.9;
  const wWaist = THREE.MathUtils.lerp(wPelvis, wShoulder, 0.42) * 0.8;
  const steps = 22;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let y2d: number;
    let rad: number;
    if (t < 0.52) {
      const u = t / 0.52;
      y2d = THREE.MathUtils.lerp(j.pelvis.y, j.lumbar.y, u);
      rad = THREE.MathUtils.lerp(wPelvis, wWaist, u);
    } else {
      const u = (t - 0.52) / 0.48;
      y2d = THREE.MathUtils.lerp(j.lumbar.y, j.sternum.y, u);
      rad = THREE.MathUtils.lerp(wWaist, wShoulder, u);
    }
    const y3 = to3(j.cx, y2d, 0)[1];
    pts.push(new THREE.Vector2(Math.max(0.045, rad), y3));
  }
  pts.sort((p1, p2) => p1.y - p2.y);
  return pts;
}

function addBone(root: THREE.Group, from: Vec3, to: Vec3, radius: number, color: string): void {
  const f = v3(from);
  const t = v3(to);
  const mid = f.clone().add(t).multiplyScalar(0.5);
  const dir = t.clone().sub(f);
  const len = Math.max(0.008, dir.length());
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const straight = Math.max(0.002, len - 2 * radius * 0.92);
  const geom = new THREE.CapsuleGeometry(radius * 0.98, straight, 5, 10);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.52 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(mid);
  mesh.quaternion.copy(q);
  root.add(mesh);
}

function addJoint(root: THREE.Group, pos: Vec3, r: number, color: string): void {
  const geom = new THREE.SphereGeometry(r, 12, 12);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.07, roughness: 0.46 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  root.add(mesh);
}

function addIkDash(root: THREE.Group, a: Vec3, b: Vec3): void {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b], 3));
  const mat = new THREE.LineDashedMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.38,
    dashSize: 0.034,
    gapSize: 0.042,
    depthWrite: false,
  });
  const line = new THREE.LineSegments(geom, mat);
  line.computeLineDistances();
  root.add(line);
}

function buildHumanoidGroup(joints: AvatarRigJoints2D): THREE.Group {
  const root = new THREE.Group();
  const headTop = joints.headCy - joints.headRy;
  const span = Math.max(110, joints.footBaseline - headTop);
  const kk = 1.58 / span;
  const fb = joints.footBaseline;
  const to3 = (x: number, y: number, zOff = 0): Vec3 => [(x - joints.cx) * kk, (fb - y) * kk, zOff] as const;

  const profile = buildTorsoLatheProfile(joints, kk, to3);
  const torsoGeom = new THREE.LatheGeometry(profile, 30);
  const maxR = Math.max(0.08, profile[profile.length - 1]?.x ?? 0.2);
  const dep = 0.055 * kk * 48;
  const zSquash = Math.max(0.22, Math.min(0.52, dep / maxR));

  const meshFill = "#94a3b8";
  const bone = "#6d28d9";
  const joint = "#a78bfa";

  const torsoMat = new THREE.MeshStandardMaterial({
    color: meshFill,
    metalness: 0.02,
    roughness: 0.7,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const torso = new THREE.Mesh(torsoGeom, torsoMat);
  torso.scale.set(1, 1, zSquash);
  root.add(torso);

  const headEll: [number, number, number] = [
    joints.headRx * kk * 0.98,
    joints.headRy * kk * 0.98,
    ((joints.headRx + joints.headRy) / 2) * kk * 0.74,
  ];
  const headGeom = new THREE.SphereGeometry(1, 20, 18);
  const headMat = new THREE.MeshStandardMaterial({
    color: meshFill,
    metalness: 0.03,
    roughness: 0.58,
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const head = new THREE.Mesh(headGeom, headMat);
  const hc = to3(joints.headC.x, joints.headCy, 0);
  head.position.set(hc[0], hc[1], hc[2]);
  head.scale.set(headEll[0], headEll[1], headEll[2]);
  root.add(head);

  const amb = new THREE.AmbientLight(0xffffff, 0.78);
  root.add(amb);
  const d1 = new THREE.DirectionalLight(0xffffff, 0.72);
  d1.position.set(1.1, 2.2, 1.65);
  root.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.26);
  d2.position.set(-1.35, 1.05, -0.75);
  root.add(d2);
  const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x64748b, 0.18);
  root.add(hemi);

  const p = joints;
  const rb = 0.022;
  const rArm = 0.0175;
  const rLeg = 0.024;

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

  addBone(root, to3(p.pelvis.x, p.pelvis.y, 0), to3(p.lumbar.x, p.lumbar.y, 0), rb, bone);
  addBone(root, to3(p.lumbar.x, p.lumbar.y, 0), to3(p.thorax.x, p.thorax.y, 0), rb * 0.96, bone);
  addBone(root, to3(p.thorax.x, p.thorax.y, 0), to3(p.sternum.x, p.sternum.y, 0), rb * 0.93, bone);
  addBone(root, to3(p.sternum.x, p.sternum.y, 0), to3(p.neckBase.x, p.neckBase.y, 0), rb * 0.86, bone);
  addBone(
    root,
    to3(p.neckBase.x, p.neckBase.y, 0),
    to3(p.headC.x, p.headCy - joints.headRy * 0.32, 0),
    rb * 0.72,
    bone
  );

  addBone(root, to3(p.sternum.x, p.sternum.y, 0), to3(p.shoulderLw.x, p.shoulderLw.y, -0.012), rArm * 0.88, bone);
  addBone(root, to3(p.sternum.x, p.sternum.y, 0), to3(p.shoulderRw.x, p.shoulderRw.y, 0.012), rArm * 0.88, bone);
  addBone(root, to3(p.shoulderLw.x, p.shoulderLw.y, -0.012), to3(p.elbowL.x, p.elbowL.y, -0.018), rArm, bone);
  addBone(root, to3(p.elbowL.x, p.elbowL.y, -0.018), to3(p.wristL.x, p.wristL.y, -0.02), rArm * 0.84, bone);
  addBone(root, to3(p.shoulderRw.x, p.shoulderRw.y, 0.012), to3(p.elbowR.x, p.elbowR.y, 0.018), rArm, bone);
  addBone(root, to3(p.elbowR.x, p.elbowR.y, 0.018), to3(p.wristR.x, p.wristR.y, 0.02), rArm * 0.84, bone);

  addBone(root, to3(p.pelvis.x, p.pelvis.y, 0), to3(p.hipL0.x, p.hipL0.y, 0), rLeg * 0.76, bone);
  addBone(root, to3(p.pelvis.x, p.pelvis.y, 0), to3(p.hipR0.x, p.hipR0.y, 0), rLeg * 0.76, bone);
  addBone(root, to3(p.hipL0.x, p.hipL0.y, 0), to3(p.kneeL.x, p.kneeL.y, 0), rLeg, bone);
  addBone(root, to3(p.kneeL.x, p.kneeL.y, 0), to3(p.ankleL.x, p.ankleL.y, 0), rLeg * 0.9, bone);
  addBone(root, to3(p.hipR0.x, p.hipR0.y, 0), to3(p.kneeR.x, p.kneeR.y, 0), rLeg, bone);
  addBone(root, to3(p.kneeR.x, p.kneeR.y, 0), to3(p.ankleR.x, p.ankleR.y, 0), rLeg * 0.9, bone);

  const jr = Math.max(0.014, joints.jointR * kk * 0.46);
  const jointPositions: Vec3[] = [
    to3(p.headC.x, p.headCy, 0),
    to3(p.neckBase.x, p.neckBase.y, 0),
    to3(p.sternum.x, p.sternum.y, 0),
    to3(p.thorax.x, p.thorax.y, 0),
    to3(p.lumbar.x, p.lumbar.y, 0),
    to3(p.pelvis.x, p.pelvis.y, 0),
    to3(p.shoulderLw.x, p.shoulderLw.y, -0.012),
    to3(p.shoulderRw.x, p.shoulderRw.y, 0.012),
    to3(p.elbowL.x, p.elbowL.y, -0.018),
    to3(p.elbowR.x, p.elbowR.y, 0.018),
    to3(p.wristL.x, p.wristL.y, -0.02),
    to3(p.wristR.x, p.wristR.y, 0.02),
    to3(p.kneeL.x, p.kneeL.y, 0),
    to3(p.kneeR.x, p.kneeR.y, 0),
    to3(p.ankleL.x, p.ankleL.y, 0),
    to3(p.ankleR.x, p.ankleR.y, 0),
  ];
  for (const pos of jointPositions) addJoint(root, pos, jr, joint);

  return root;
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

export type HumanoidMountHandle = { destroy: () => void };

/**
 * Monta WebGL dentro de `container` (esvazia filhos existentes).
 */
export function mountProceduralHumanoidScene(container: HTMLElement, joints: AvatarRigJoints2D): HumanoidMountHandle {
  while (container.firstChild) container.removeChild(container.firstChild);

  const scene = new THREE.Scene();
  const group = buildHumanoidGroup(joints);
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.08, 22);
  const lookY = 1.58 * 0.44;
  camera.position.set(0, 0.78, 1.42);
  camera.lookAt(0, lookY, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    stencil: false,
  });
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

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
      disposeObject3D(group);
      scene.remove(group);
      renderer.dispose();
      canvas.remove();
    },
  };
}
