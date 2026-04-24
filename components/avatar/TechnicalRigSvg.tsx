import type { BodyScaleFactors } from "./avatar-utils";
import type { PoseLayout } from "./Pose";
import { rotatePoint } from "./Pose";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  className?: string;
};

const ROOT_STYLE = {
  ["--avatar-stroke" as string]: "color-mix(in srgb, var(--border) 92%, var(--text-secondary) 8%)",
  ["--rig-bone" as string]: "color-mix(in srgb, var(--primary) 72%, #6b21a8 28%)",
  ["--rig-joint" as string]: "color-mix(in srgb, var(--primary) 55%, var(--text-secondary) 45%)",
  ["--rig-ik" as string]: "color-mix(in srgb, var(--text-secondary) 45%, transparent)",
  ["--rig-mesh" as string]: "color-mix(in srgb, var(--text-secondary) 22%, transparent)",
} as const;

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

/** Ponto no espaço do braço (coords absolutas do path), depois rotação ombro, depois torso. */
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

/** Perna: path igual a `Body.tsx`; amostra joelho e tornozelo no espaço pré-rotação anca, depois aplica `legDeg` na anca. */
function legWorld(
  hip: { x: number; y: number },
  p: { x: number; y: number },
  legDeg: number
): { x: number; y: number } {
  return rotatePoint(p.x, p.y, hip.x, hip.y, legDeg);
}

/**
 * Vista técnica 2D estilo «mesh + ossos»: linhas de ossos, nós, guias tipo IK e malha muito suave.
 * Usa os mesmos `BodyScaleFactors` e `PoseLayout` que o avatar ilustrativo (dados da ficha 6.4 + perfil).
 */
export function TechnicalRigSvg({ scales, pose, className }: Props) {
  const { shoulder, chest, waist, hip, thigh, calf, height, bulk, legInseam } = scales;
  const cx = 100;
  const headCy = 52;
  const headRx = Math.max(18, 22 * height * 0.92);
  const headRy = Math.max(22, 28 * height * 0.95);

  const shW = 34 * shoulder * bulk * (0.78 + 0.22 * chest);
  const wW = 22 * waist * bulk;
  const hW = 40 * hip * bulk;
  const yNeck = 72;
  const yShoulder = 88;
  const yWaist = 158;
  const yHip = 188;

  const torsoPath = `
    M ${cx - shW},${yShoulder}
    C ${cx - shW * 1.05},${(yShoulder + yWaist) / 2} ${cx - wW * 0.95},${yWaist - 8} ${cx - wW},${yWaist}
    C ${cx - wW * 0.88},${yWaist + 14} ${cx - hW * 0.92},${yHip - 10} ${cx - hW},${yHip}
    L ${cx + hW},${yHip}
    C ${cx + hW * 0.92},${yHip - 10} ${cx + wW * 0.88},${yWaist + 14} ${cx + wW},${yWaist}
    C ${cx + wW * 0.95},${yWaist - 8} ${cx + shW * 1.05},${(yShoulder + yWaist) / 2} ${cx + shW},${yShoulder}
    L ${cx + shW * 0.55},${yNeck}
    Q ${cx},${yNeck - 6} ${cx - shW * 0.55},${yNeck}
    Z
  `.replace(/\s+/g, " ");

  const legLenMul = 0.82 + 0.18 * legInseam;
  const thighLen = 58 * height * legLenMul;
  const calfLen = 52 * height * legLenMul;
  const dx = pose.stanceDx;
  const bonus = pose.legSpreadBonus ?? 0;
  const kneeOut = 14 * thigh * bulk + bonus;
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

  const elbowL = armWorld(al, quadBezierPoint(al, ctrlL, endL, 0.52), pose.armLdeg, pose.torsoDeg, pose.torsoPivot);
  const elbowR = armWorld(ar, quadBezierPoint(ar, ctrlR, endR, 0.52), pose.armRdeg, pose.torsoDeg, pose.torsoPivot);
  /** Punhos alinhados ao mesmo `handsFromArms` que o avatar + rotação de torso. */
  const wristL = rotatePoint(pose.handL.x, pose.handL.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const wristR = rotatePoint(pose.handR.x, pose.handR.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);

  const sternum = rotatePoint(cx, yShoulder - 2, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const shoulderLw = rotatePoint(al.x, al.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const shoulderRw = rotatePoint(ar.x, ar.y, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const pelvis = { x: cx, y: yHip };
  const lumbar = rotatePoint(cx, (yWaist + yHip) * 0.5, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const thorax = rotatePoint(cx, (yShoulder + yWaist) * 0.5, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const neckBase = rotatePoint(cx, yNeck + 4, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);
  const headC = rotatePoint(cx, headCy, pose.torsoPivot.x, pose.torsoPivot.y, pose.torsoDeg);

  const jointR = Math.max(3.2, 3.8 * Math.min(1.15, bulk));

  return (
    <div className={className} style={ROOT_STYLE}>
      <svg viewBox="0 0 200 400" className="mx-auto block w-full max-w-[200px]" style={{ overflow: "visible" }} aria-hidden>
        <g opacity={0.14} fill="var(--rig-mesh)" stroke="var(--avatar-stroke)" strokeWidth={0.6}>
          <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} transform={`rotate(${pose.torsoDeg}, ${pose.torsoPivot.x}, ${pose.torsoPivot.y})`} />
          <path d={torsoPath} transform={`rotate(${pose.torsoDeg}, ${pose.torsoPivot.x}, ${pose.torsoPivot.y})`} />
        </g>

        <g stroke="var(--rig-ik)" strokeWidth={0.55} strokeDasharray="4 5" opacity={0.55} fill="none">
          <line x1={pelvis.x} y1={pelvis.y} x2={ankleL.x} y2={ankleL.y} />
          <line x1={pelvis.x} y1={pelvis.y} x2={ankleR.x} y2={ankleR.y} />
          <line x1={ankleL.x} y1={ankleL.y} x2={ankleR.x} y2={ankleR.y} />
          <line x1={sternum.x} y1={sternum.y} x2={wristL.x} y2={wristL.y} opacity={0.45} />
          <line x1={sternum.x} y1={sternum.y} x2={wristR.x} y2={wristR.y} opacity={0.45} />
        </g>

        <g stroke="var(--rig-bone)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={pelvis.x} y1={pelvis.y} x2={lumbar.x} y2={lumbar.y} />
          <line x1={lumbar.x} y1={lumbar.y} x2={thorax.x} y2={thorax.y} />
          <line x1={thorax.x} y1={thorax.y} x2={sternum.x} y2={sternum.y} />
          <line x1={sternum.x} y1={sternum.y} x2={neckBase.x} y2={neckBase.y} />
          <line x1={neckBase.x} y1={neckBase.y} x2={headC.x} y2={headC.y} />
          <line x1={sternum.x} y1={sternum.y} x2={shoulderLw.x} y2={shoulderLw.y} />
          <line x1={sternum.x} y1={sternum.y} x2={shoulderRw.x} y2={shoulderRw.y} />
          <line x1={shoulderLw.x} y1={shoulderLw.y} x2={elbowL.x} y2={elbowL.y} />
          <line x1={elbowL.x} y1={elbowL.y} x2={wristL.x} y2={wristL.y} />
          <line x1={shoulderRw.x} y1={shoulderRw.y} x2={elbowR.x} y2={elbowR.y} />
          <line x1={elbowR.x} y1={elbowR.y} x2={wristR.x} y2={wristR.y} />
          <line x1={pelvis.x} y1={pelvis.y} x2={hipL0.x} y2={hipL0.y} />
          <line x1={pelvis.x} y1={pelvis.y} x2={hipR0.x} y2={hipR0.y} />
          <line x1={hipL0.x} y1={hipL0.y} x2={kneeL.x} y2={kneeL.y} />
          <line x1={kneeL.x} y1={kneeL.y} x2={ankleL.x} y2={ankleL.y} />
          <line x1={hipR0.x} y1={hipR0.y} x2={kneeR.x} y2={kneeR.y} />
          <line x1={kneeR.x} y1={kneeR.y} x2={ankleR.x} y2={ankleR.y} />
        </g>

        <g fill="var(--rig-joint)">
          {[
            headC,
            neckBase,
            sternum,
            thorax,
            lumbar,
            pelvis,
            shoulderLw,
            shoulderRw,
            elbowL,
            elbowR,
            wristL,
            wristR,
            kneeL,
            kneeR,
            ankleL,
            ankleR,
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={jointR} />
          ))}
        </g>
      </svg>
    </div>
  );
}
