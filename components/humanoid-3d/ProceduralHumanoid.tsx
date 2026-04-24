"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { AvatarRigJoints2D } from "@/lib/avatar-rig-joints";

type Vec3 = readonly [number, number, number];

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
  const { position, quaternion, length } = useMemo(() => {
    const f = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const mid = f.clone().add(t).multiplyScalar(0.5);
    const dir = t.clone().sub(f);
    const len = Math.max(0.008, dir.length());
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
    >
      <cylinderGeometry args={[radius, radius * 0.9, length, 8]} />
      <meshStandardMaterial color={color} metalness={0.04} roughness={0.62} />
    </mesh>
  );
}

function JointSphere({ position, r, color }: { position: Vec3; r: number; color: string }) {
  return (
    <mesh position={[...position]}>
      <sphereGeometry args={[r, 10, 10]} />
      <meshStandardMaterial color={color} metalness={0.06} roughness={0.45} />
    </mesh>
  );
}

/**
 * Humanóide procedural (cilindros + esferas), sem GLB — custo zero de licença e chunk isolado.
 * Proporções derivadas dos mesmos pontos 2D que o diagrama técnico.
 */
export function ProceduralHumanoid({ joints }: { joints: AvatarRigJoints2D }) {
  const { to3, headR, depth, unit } = useMemo(() => {
    const headTop = joints.headCy - joints.headRy;
    const span = Math.max(110, joints.footBaseline - headTop);
    const kk = 1.58 / span;
    const fb = joints.footBaseline;
    const mapper = (x: number, y: number, zOff = 0): Vec3 => [(x - joints.cx) * kk, (fb - y) * kk, zOff] as const;
    const hr = ((joints.headRx + joints.headRy) / 2) * kk * 0.92;
    return { to3: mapper, headR: Math.max(0.04, hr), depth: 0.055 * kk * 48, unit: kk };
  }, [joints]);

  const bone = "#6d28d9";
  const joint = "#8b5cf6";
  const flesh = "#94a3b8";

  const p = joints;
  const rb = 0.024;
  const rArm = 0.019;
  const rLeg = 0.026;

  const torsoH = Math.max(0.2, (p.pelvis.y - p.sternum.y) * unit);
  const torsoW = Math.max(0.1, Math.abs(p.shoulderLw.x - p.shoulderRw.x) * unit * 0.62);
  const torsoCenterY = (p.pelvis.y + p.sternum.y) / 2;
  const torsoPos = to3(p.cx, torsoCenterY, 0);

  return (
    <group>
      <ambientLight intensity={0.72} />
      <directionalLight position={[1.2, 2.4, 1.8]} intensity={0.85} castShadow={false} />
      <directionalLight position={[-1.5, 1.2, -0.8]} intensity={0.28} />

      <mesh position={torsoPos}>
        <boxGeometry args={[torsoW, Math.max(0.12, torsoH), depth]} />
        <meshStandardMaterial color={flesh} metalness={0.02} roughness={0.68} transparent opacity={0.42} />
      </mesh>

      <mesh position={to3(p.headC.x, p.headCy, 0)}>
        <sphereGeometry args={[headR, 14, 14]} />
        <meshStandardMaterial color={flesh} metalness={0.03} roughness={0.55} transparent opacity={0.5} />
      </mesh>

      <BoneSegment from={to3(p.pelvis.x, p.pelvis.y, 0)} to={[...to3(p.lumbar.x, p.lumbar.y, 0)]} radius={rb} color={bone} />
      <BoneSegment from={to3(p.lumbar.x, p.lumbar.y, 0)} to={[...to3(p.thorax.x, p.thorax.y, 0)]} radius={rb * 0.95} color={bone} />
      <BoneSegment from={to3(p.thorax.x, p.thorax.y, 0)} to={[...to3(p.sternum.x, p.sternum.y, 0)]} radius={rb * 0.92} color={bone} />
      <BoneSegment from={to3(p.sternum.x, p.sternum.y, 0)} to={[...to3(p.neckBase.x, p.neckBase.y, 0)]} radius={rb * 0.85} color={bone} />
      <BoneSegment from={to3(p.neckBase.x, p.neckBase.y, 0)} to={[...to3(p.headC.x, p.headCy - joints.headRy * 0.35, 0)]} radius={rb * 0.75} color={bone} />

      <BoneSegment from={to3(p.sternum.x, p.sternum.y, 0)} to={[...to3(p.shoulderLw.x, p.shoulderLw.y, -0.012)]} radius={rArm * 0.85} color={bone} />
      <BoneSegment from={to3(p.sternum.x, p.sternum.y, 0)} to={[...to3(p.shoulderRw.x, p.shoulderRw.y, 0.012)]} radius={rArm * 0.85} color={bone} />

      <BoneSegment from={to3(p.shoulderLw.x, p.shoulderLw.y, -0.012)} to={[...to3(p.elbowL.x, p.elbowL.y, -0.018)]} radius={rArm} color={bone} />
      <BoneSegment from={to3(p.elbowL.x, p.elbowL.y, -0.018)} to={[...to3(p.wristL.x, p.wristL.y, -0.02)]} radius={rArm * 0.82} color={bone} />
      <BoneSegment from={to3(p.shoulderRw.x, p.shoulderRw.y, 0.012)} to={[...to3(p.elbowR.x, p.elbowR.y, 0.018)]} radius={rArm} color={bone} />
      <BoneSegment from={to3(p.elbowR.x, p.elbowR.y, 0.018)} to={[...to3(p.wristR.x, p.wristR.y, 0.02)]} radius={rArm * 0.82} color={bone} />

      <BoneSegment from={to3(p.pelvis.x, p.pelvis.y, 0)} to={[...to3(p.hipL0.x, p.hipL0.y, 0)]} radius={rLeg * 0.75} color={bone} />
      <BoneSegment from={to3(p.pelvis.x, p.pelvis.y, 0)} to={[...to3(p.hipR0.x, p.hipR0.y, 0)]} radius={rLeg * 0.75} color={bone} />
      <BoneSegment from={to3(p.hipL0.x, p.hipL0.y, 0)} to={[...to3(p.kneeL.x, p.kneeL.y, 0)]} radius={rLeg} color={bone} />
      <BoneSegment from={to3(p.kneeL.x, p.kneeL.y, 0)} to={[...to3(p.ankleL.x, p.ankleL.y, 0)]} radius={rLeg * 0.88} color={bone} />
      <BoneSegment from={to3(p.hipR0.x, p.hipR0.y, 0)} to={[...to3(p.kneeR.x, p.kneeR.y, 0)]} radius={rLeg} color={bone} />
      <BoneSegment from={to3(p.kneeR.x, p.kneeR.y, 0)} to={[...to3(p.ankleR.x, p.ankleR.y, 0)]} radius={rLeg * 0.88} color={bone} />

      {[
        to3(p.headC.x, p.headCy, 0),
        to3(p.neckBase.x, p.neckBase.y, 0),
        to3(p.sternum.x, p.sternum.y, 0),
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
        <JointSphere key={i} position={pos} r={Math.max(0.016, joints.jointR * unit * 0.48)} color={joint} />
      ))}
    </group>
  );
}
