import type { BodyScaleFactors } from "./avatar-utils";
import type { PoseLayout } from "./Pose";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
};

/**
 * Corpo em paths curvos; braços com rotação a partir do ombro (pose).
 */
export function Body({ scales, pose }: Props) {
  const { shoulder, waist, hip, thigh, calf, height, bulk } = scales;

  const headRx = 22 * height * 0.92;
  const headRy = 28 * height * 0.95;
  const cx = 100;
  const headCy = 52;

  const shW = 34 * shoulder * bulk;
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

  const neckPath = `
    M ${cx - shW * 0.42},${yNeck}
    Q ${cx},${yNeck + 10} ${cx + shW * 0.42},${yNeck}
    L ${cx + shW * 0.38},${yShoulder - 4}
    Q ${cx},${yShoulder + 2} ${cx - shW * 0.38},${yShoulder - 4}
    Z
  `.replace(/\s+/g, " ");

  const tw = 5.5 * thigh * bulk;
  const cw = 4.8 * calf * bulk;
  const thighLen = 72 * height * 0.98;
  const calfLen = 68 * height * 0.96;
  const dx = pose.stanceDx;

  const hipY = yHip;
  const kneeY = hipY + thighLen * 0.55;
  const ankleY = hipY + thighLen + calfLen * 0.92;
  const footY = ankleY + 10;

  const leftLegPath = `
    M ${cx - hW * 0.55 + dx},${hipY}
    C ${cx - hW * 0.35 + dx * 0.5},${hipY + thighLen * 0.35} ${cx - tw + dx},${kneeY} ${cx - tw * 0.92 + dx * 0.3},${hipY + thighLen}
    C ${cx - cw + dx * 0.2},${hipY + thighLen + calfLen * 0.4} ${cx - cw * 0.95},${ankleY} ${cx - cw * 0.85 + dx},${footY}
  `.replace(/\s+/g, " ");

  const rightLegPath = `
    M ${cx + hW * 0.55 - dx},${hipY}
    C ${cx + hW * 0.35 - dx * 0.5},${hipY + thighLen * 0.35} ${cx + tw - dx},${kneeY} ${cx + tw * 0.92 - dx * 0.3},${hipY + thighLen}
    C ${cx + cw - dx * 0.2},${hipY + thighLen + calfLen * 0.4} ${cx + cw * 0.95},${ankleY} ${cx + cw * 0.85 - dx},${footY}
  `.replace(/\s+/g, " ");

  const armStroke = 5.2 * scales.arm * bulk;
  const al = pose.shoulderL;
  const ar = pose.shoulderR;
  const armLen = pose.armLen;

  const leftArmPath = `
    M ${al.x},${al.y}
    Q ${al.x - 6},${al.y + armLen * 0.45} ${al.x - 2},${al.y + armLen}
  `.replace(/\s+/g, " ");

  const rightArmPath = `
    M ${ar.x},${ar.y}
    Q ${ar.x + 6},${ar.y + armLen * 0.45} ${ar.x + 2},${ar.y + armLen}
  `.replace(/\s+/g, " ");

  const tt = pose.torsoDeg !== 0 ? `rotate(${pose.torsoDeg}, ${pose.torsoPivot.x}, ${pose.torsoPivot.y})` : undefined;

  return (
    <g className="avatar-body" fill="var(--avatar-fill)" stroke="var(--avatar-stroke)" strokeWidth={0.6} strokeOpacity={0.85}>
      <g transform={tt}>
        <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} />
        <path d={neckPath} strokeWidth={0.45} />
        <path d={torsoPath} />
        <g transform={`rotate(${pose.armLdeg}, ${al.x}, ${al.y})`}>
          <path d={leftArmPath} fill="none" strokeWidth={armStroke} strokeLinecap="round" />
        </g>
        <g transform={`rotate(${pose.armRdeg}, ${ar.x}, ${ar.y})`}>
          <path d={rightArmPath} fill="none" strokeWidth={armStroke} strokeLinecap="round" />
        </g>
      </g>
      <g>
        <path d={leftLegPath} fill="none" strokeWidth={tw * 1.35} strokeLinecap="round" strokeLinejoin="round" />
        <path d={rightLegPath} fill="none" strokeWidth={tw * 1.35} strokeLinecap="round" strokeLinejoin="round" />
        <path d={leftLegPath} fill="none" strokeWidth={cw * 1.15} strokeLinecap="round" opacity={0.95} />
        <path d={rightLegPath} fill="none" strokeWidth={cw * 1.15} strokeLinecap="round" opacity={0.95} />
      </g>
    </g>
  );
}
