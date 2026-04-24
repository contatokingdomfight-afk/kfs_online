"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AvatarRigJoints2D } from "@/lib/avatar-rig-joints";

type Vec3 = readonly [number, number, number];

/** Ossos com extremidades arredondadas (como stroke «round» no diagrama 2D). */
function BoneSegment({
  from,
  to,
  radius,
  color,
}: {
  from: Vec3;
  to: Vec3;
  radius: number;
  color: string;
}) {
  const { position, quaternion, capLen } = useMemo(() => {
    const f = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const mid = f.clone().add(t).multiplyScalar(0.5);
    const dir = t.clone().sub(f);
    const len = Math.max(0.008, dir.length());
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const straight = Math.max(0.002, len - 2 * radius * 0.92);
    return { position: mid, quaternion: q, capLen: straight };
  }, [from, to, radius]);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
    >
      <capsuleGeometry args={[radius * 0.98, capLen, 5, 10]} />
      <meshStandardMaterial color={color} metalness={0.05} roughness={0.52} />
    </mesh>
  );
}

function JointSphere({ position, r, color }: { position: Vec3; r: number; color: string }) {
  return (
    <mesh position={[...position]}>
      <sphereGeometry args={[r, 12, 12]} />
      <meshStandardMaterial color={color} metalness={0.07} roughness={0.46} />
    </mesh>
  );
}

/** Um segmento tracejado (IK), compatível com `computeLineDistances`. */
function IkDash({ a, b }: { a: Vec3; b: Vec3 }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b], 3));
    return g;
  }, [a, b]);

  useLayoutEffect(() => {
    ref.current?.computeLineDistances();
  }, [geom]);

  return (
    <lineSegments ref={ref} geometry={geom} frustumCulled={false}>
      <lineDashedMaterial
        color="#64748b"
        transparent
        opacity={0.38}
        dashSize={0.034}
        gapSize={0.042}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function buildTorsoLatheProfile(j: AvatarRigJoints2D, unit: number, to3: (x: number, y: number, z?: number) => Vec3): THREE.Vector2[] {
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

/**
 * Humanóide procedural alinhado ao diagrama técnico 2D (malha suave + ossos + guias).
 * Sem GLB — chunk isolado.
 */
export function ProceduralHumanoid({ joints }: { joints: AvatarRigJoints2D }) {
  const { to3, unit, headEllipsoid, torsoGeom, zSquash } = useMemo(() => {
    const headTop = joints.headCy - joints.headRy;
    const span = Math.max(110, joints.footBaseline - headTop);
    const kk = 1.58 / span;
    const fb = joints.footBaseline;
    const mapper = (x: number, y: number, zOff = 0): Vec3 => [(x - joints.cx) * kk, (fb - y) * kk, zOff] as const;
    const profile = buildTorsoLatheProfile(joints, kk, mapper);
    const geom = new THREE.LatheGeometry(profile, 30);
    const maxR = Math.max(0.08, profile[profile.length - 1]?.x ?? 0.2);
    const dep = 0.055 * kk * 48;
    const zS = Math.max(0.22, Math.min(0.52, dep / maxR));
    return {
      to3: mapper,
      unit: kk,
      headEllipsoid: [
        joints.headRx * kk * 0.98,
        joints.headRy * kk * 0.98,
        ((joints.headRx + joints.headRy) / 2) * kk * 0.74,
      ] as const,
      torsoGeom: geom,
      zSquash: zS,
    };
  }, [joints]);

  useEffect(() => {
    return () => {
      torsoGeom.dispose();
    };
  }, [torsoGeom]);

  const bone = "#6d28d9";
  const joint = "#a78bfa";
  const meshFill = "#94a3b8";

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

  return (
    <group>
      <ambientLight intensity={0.78} />
      <directionalLight position={[1.1, 2.2, 1.65]} intensity={0.72} castShadow={false} />
      <directionalLight position={[-1.35, 1.05, -0.75]} intensity={0.26} />
      <hemisphereLight args={["#f1f5f9", "#64748b"]} intensity={0.18} />

      <mesh geometry={torsoGeom} scale={[1, 1, zSquash]}>
        <meshStandardMaterial
          color={meshFill}
          metalness={0.02}
          roughness={0.7}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={to3(p.headC.x, p.headCy, 0)} scale={headEllipsoid}>
        <sphereGeometry args={[1, 20, 18]} />
        <meshStandardMaterial
          color={meshFill}
          metalness={0.03}
          roughness={0.58}
          transparent
          opacity={0.36}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <IkDash a={pelvis3} b={ankleL3} />
      <IkDash a={pelvis3} b={ankleR3} />
      <IkDash a={ankleL3} b={ankleR3} />
      <IkDash a={sternum3} b={wristL3} />
      <IkDash a={sternum3} b={wristR3} />

      <BoneSegment from={to3(p.pelvis.x, p.pelvis.y, 0)} to={[...to3(p.lumbar.x, p.lumbar.y, 0)]} radius={rb} color={bone} />
      <BoneSegment from={to3(p.lumbar.x, p.lumbar.y, 0)} to={[...to3(p.thorax.x, p.thorax.y, 0)]} radius={rb * 0.96} color={bone} />
      <BoneSegment from={to3(p.thorax.x, p.thorax.y, 0)} to={[...to3(p.sternum.x, p.sternum.y, 0)]} radius={rb * 0.93} color={bone} />
      <BoneSegment from={to3(p.sternum.x, p.sternum.y, 0)} to={[...to3(p.neckBase.x, p.neckBase.y, 0)]} radius={rb * 0.86} color={bone} />
      <BoneSegment
        from={to3(p.neckBase.x, p.neckBase.y, 0)}
        to={[...to3(p.headC.x, p.headCy - joints.headRy * 0.32, 0)]}
        radius={rb * 0.72}
        color={bone}
      />

      <BoneSegment from={to3(p.sternum.x, p.sternum.y, 0)} to={[...to3(p.shoulderLw.x, p.shoulderLw.y, -0.012)]} radius={rArm * 0.88} color={bone} />
      <BoneSegment from={to3(p.sternum.x, p.sternum.y, 0)} to={[...to3(p.shoulderRw.x, p.shoulderRw.y, 0.012)]} radius={rArm * 0.88} color={bone} />

      <BoneSegment from={to3(p.shoulderLw.x, p.shoulderLw.y, -0.012)} to={[...to3(p.elbowL.x, p.elbowL.y, -0.018)]} radius={rArm} color={bone} />
      <BoneSegment from={to3(p.elbowL.x, p.elbowL.y, -0.018)} to={[...to3(p.wristL.x, p.wristL.y, -0.02)]} radius={rArm * 0.84} color={bone} />
      <BoneSegment from={to3(p.shoulderRw.x, p.shoulderRw.y, 0.012)} to={[...to3(p.elbowR.x, p.elbowR.y, 0.018)]} radius={rArm} color={bone} />
      <BoneSegment from={to3(p.elbowR.x, p.elbowR.y, 0.018)} to={[...to3(p.wristR.x, p.wristR.y, 0.02)]} radius={rArm * 0.84} color={bone} />

      <BoneSegment from={to3(p.pelvis.x, p.pelvis.y, 0)} to={[...to3(p.hipL0.x, p.hipL0.y, 0)]} radius={rLeg * 0.76} color={bone} />
      <BoneSegment from={to3(p.pelvis.x, p.pelvis.y, 0)} to={[...to3(p.hipR0.x, p.hipR0.y, 0)]} radius={rLeg * 0.76} color={bone} />
      <BoneSegment from={to3(p.hipL0.x, p.hipL0.y, 0)} to={[...to3(p.kneeL.x, p.kneeL.y, 0)]} radius={rLeg} color={bone} />
      <BoneSegment from={to3(p.kneeL.x, p.kneeL.y, 0)} to={[...to3(p.ankleL.x, p.ankleL.y, 0)]} radius={rLeg * 0.9} color={bone} />
      <BoneSegment from={to3(p.hipR0.x, p.hipR0.y, 0)} to={[...to3(p.kneeR.x, p.kneeR.y, 0)]} radius={rLeg} color={bone} />
      <BoneSegment from={to3(p.kneeR.x, p.kneeR.y, 0)} to={[...to3(p.ankleR.x, p.ankleR.y, 0)]} radius={rLeg * 0.9} color={bone} />

      {[
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
      ].map((pos, i) => (
        <JointSphere key={i} position={pos} r={Math.max(0.014, joints.jointR * unit * 0.46)} color={joint} />
      ))}
    </group>
  );
}
