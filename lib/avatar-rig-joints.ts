/**
 * Pontos 2D do rig (viewBox alargado, ex. −18…218 em X) alinhados a `Body.tsx` / `TechnicalRigSvg`.
 * Partilhado entre o diagrama SVG e o humanóide 3D procedural.
 * Contrato de dados: `DOCS/SILHUETA_CORPORAL_2D_ILUSTRATIVA.md` §7.
 */
import type { BodyScaleFactors } from "@/components/avatar/avatar-utils";
import type { PoseLayout } from "@/components/avatar/Pose";
import { rotatePoint } from "@/components/avatar/Pose";

export type AvatarRigJoints2D = {
  cx: number;
  headCy: number;
  headRx: number;
  headRy: number;
  torsoPath: string;
  torsoDeg: number;
  torsoPivot: { x: number; y: number };
  pelvis: { x: number; y: number };
  lumbar: { x: number; y: number };
  thorax: { x: number; y: number };
  sternum: { x: number; y: number };
  neckBase: { x: number; y: number };
  headC: { x: number; y: number };
  shoulderLw: { x: number; y: number };
  shoulderRw: { x: number; y: number };
  elbowL: { x: number; y: number };
  elbowR: { x: number; y: number };
  wristL: { x: number; y: number };
  wristR: { x: number; y: number };
  hipL0: { x: number; y: number };
  hipR0: { x: number; y: number };
  kneeL: { x: number; y: number };
  kneeR: { x: number; y: number };
  ankleL: { x: number; y: number };
  ankleR: { x: number; y: number };
  /** Base vertical (SVG y) para escalar mundo 3D (pés ~ em baixo). */
  footBaseline: number;
  jointR: number;
};

function quadBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function cubicPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: u3 * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t3 * p3.x,
    y: u3 * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t3 * p3.y,
  };
}

function armWorld(
  shoulder: { x: number; y: number },
  p: { x: number; y: number },
  armDeg: number,
  torsoDeg: number,
  torsoPivot: { x: number; y: number }
): { x: number; y: number } {
  const r1 = rotatePoint(p.x, p.y, shoulder.x, shoulder.y, armDeg);
  return rotatePoint(r1.x, r1.y, torsoPivot.x, torsoPivot.y, torsoDeg);
}

function legWorld(hip: { x: number; y: number }, p: { x: number; y: number }, legDeg: number): { x: number; y: number } {
  return rotatePoint(p.x, p.y, hip.x, hip.y, legDeg);
}

export function computeAvatarRigJoints(scales: BodyScaleFactors, pose: PoseLayout): AvatarRigJoints2D {
  const { shoulder, chest, waist, hip, thigh, calf, height, bulk, legInseam } = scales;
  const cx = 100;
  const headCy = 52;
  const headMul = pose.poseTag === "star" ? 0.88 : 1;
  const headRx = Math.max(16, 20 * height * 0.92) * headMul;
  const headRy = Math.max(20, 25 * height * 0.95) * headMul;

  const shWBase = 34 * shoulder * bulk * (0.78 + 0.22 * chest);
  const shW = pose.poseTag === "star" ? shWBase * 1.1 : shWBase;
  const wW = 22 * waist * bulk;
  const wh = Math.min(Math.max(waist / Math.max(hip, 0.01), 0.75), 1.32);
  const wWAdjusted = wW * (0.92 + 0.08 * wh);
  const hW = 40 * hip * bulk;
  const yNeck = 72;
  const yShoulder = 88;
  const yWaist = 158;
  const yHip = 188;

  const torsoPath = `
    M ${cx - shW},${yShoulder}
    C ${cx - shW * 1.05},${(yShoulder + yWaist) / 2} ${cx - wWAdjusted * 0.95},${yWaist - 8} ${cx - wWAdjusted},${yWaist}
    C ${cx - wWAdjusted * 0.88},${yWaist + 14} ${cx - hW * 0.92},${yHip - 10} ${cx - hW},${yHip}
    L ${cx + hW},${yHip}
    C ${cx + hW * 0.92},${yHip - 10} ${cx + wWAdjusted * 0.88},${yWaist + 14} ${cx + wWAdjusted},${yWaist}
    C ${cx + wWAdjusted * 0.95},${yWaist - 8} ${cx + shW * 1.05},${(yShoulder + yWaist) / 2} ${cx + shW},${yShoulder}
    L ${cx + shW * 0.55},${yNeck}
    Q ${cx},${yNeck - 6} ${cx - shW * 0.55},${yNeck}
    Z
  `.replace(/\s+/g, " ");

  const legLenMul = 0.82 + 0.18 * legInseam;
  const thighLen = 58 * height * legLenMul;
  const calfLen = 52 * height * legLenMul;
  const dx = pose.stanceDx;
  const bonus = pose.legSpreadBonus ?? 0;
  const kneeOutBase = 14 * thigh * bulk + bonus;
  const kneeOut = pose.poseTag === "star" ? kneeOutBase * 0.66 : kneeOutBase;
  const hipY = yHip;
  const kneeY = hipY + thighLen * 0.52;
  const ankleY = hipY + thighLen + calfLen * 0.88;
  const footY = ankleY + 12;
  const { hipL, hipR } = pose;

  const hipL0 = { ...hipL };
  const hipR0 = { ...hipR };
  const p0L = { x: hipL.x, y: hipL.y };
  const p1L = { x: hipL.x - kneeOut * 0.12 + dx * 0.08, y: hipY + thighLen * 0.28 };
  const p2L = { x: hipL.x - kneeOut * 0.88, y: kneeY - 2 };
  const p3L = { x: hipL.x - kneeOut * 0.95, y: hipY + thighLen };
  const p4L = { x: hipL.x - kneeOut * 1.02 - dx * 0.12, y: hipY + thighLen + calfLen * 0.32 };
  const p5L = { x: hipL.x - kneeOut * 1.08 - dx * 0.35, y: ankleY };
  const p6L = { x: hipL.x - kneeOut * 1.05 - dx * 0.5, y: footY };

  const p0R = { x: hipR.x, y: hipR.y };
  const p1R = { x: hipR.x + kneeOut * 0.12 - dx * 0.08, y: hipY + thighLen * 0.28 };
  const p2R = { x: hipR.x + kneeOut * 0.88, y: kneeY - 2 };
  const p3R = { x: hipR.x + kneeOut * 0.95, y: hipY + thighLen };
  const p4R = { x: hipR.x + kneeOut * 1.02 + dx * 0.12, y: hipY + thighLen + calfLen * 0.32 };
  const p5R = { x: hipR.x + kneeOut * 1.08 + dx * 0.35, y: ankleY };
  const p6R = { x: hipR.x + kneeOut * 1.05 + dx * 0.5, y: footY };

  const kneeL = legWorld(hipL0, cubicPoint(p0L, p1L, p2L, p3L, 0.55), pose.legLdeg);
  const ankleL = legWorld(hipL0, cubicPoint(p3L, p4L, p5L, p6L, 0.72), pose.legLdeg);
  const kneeR = legWorld(hipR0, cubicPoint(p0R, p1R, p2R, p3R, 0.55), pose.legRdeg);
  const ankleR = legWorld(hipR0, cubicPoint(p3R, p4R, p5R, p6R, 0.72), pose.legRdeg);

  const al = pose.shoulderL;
  const ar = pose.shoulderR;
  const armLen = pose.armLen;
  const ctrlL = { x: al.x - 8, y: al.y + armLen * 0.42 };
  const endL = { x: al.x - 3, y: al.y + armLen };
  const ctrlR = { x: ar.x + 8, y: ar.y + armLen * 0.42 };
  const endR = { x: ar.x + 3, y: ar.y + armLen };

  const wristL = rotatePoint(pose.handL.x, pose.handL.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const wristR = rotatePoint(pose.handR.x, pose.handR.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const elbowL =
    pose.poseTag === "star"
      ? {
          x: al.x + (wristL.x - al.x) * 0.5,
          y: al.y + (wristL.y - al.y) * 0.5,
        }
      : armWorld(al, quadBezierPoint(al, ctrlL, endL, 0.52), pose.armLdeg, pose.torsoDeg, pose.torsoPivot);
  const elbowR =
    pose.poseTag === "star"
      ? {
          x: ar.x + (wristR.x - ar.x) * 0.5,
          y: ar.y + (wristR.y - ar.y) * 0.5,
        }
      : armWorld(ar, quadBezierPoint(ar, ctrlR, endR, 0.52), pose.armRdeg, pose.torsoDeg, pose.torsoPivot);

  const sternum = rotatePoint(cx, yShoulder - 2, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const shoulderLw = rotatePoint(al.x, al.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const shoulderRw = rotatePoint(ar.x, ar.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const pelvis = { x: cx, y: yHip };
  const lumbar = rotatePoint(cx, (yWaist + yHip) * 0.5, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const thorax = rotatePoint(cx, (yShoulder + yWaist) * 0.5, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const neckBase = rotatePoint(cx, yNeck + 4, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const headC = rotatePoint(cx, headCy, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);

  const footBaseline = Math.max(ankleL.y, ankleR.y, footY) + 6;
  const jointR = Math.max(3.2, 3.8 * Math.min(1.15, bulk));

  return {
    cx,
    headCy,
    headRx,
    headRy,
    torsoPath,
    torsoDeg: pose.torsoDeg,
    torsoPivot: pose.torsoPivot,
    pelvis,
    lumbar,
    thorax,
    sternum,
    neckBase,
    headC,
    shoulderLw,
    shoulderRw,
    elbowL,
    elbowR,
    wristL,
    wristR,
    hipL0,
    hipR0,
    kneeL,
    kneeR,
    ankleL,
    ankleR,
    footBaseline,
    jointR,
  };
}
