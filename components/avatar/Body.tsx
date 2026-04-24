import type { BodyScaleFactors } from "./avatar-utils";
import type { PoseLayout } from "./Pose";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
};

/**
 * Corpo em paths curvos; pernas com espessura mínima (evita “agulhas”);
 * afastamento do joelho em px real (não usar largura de stroke como coordenada).
 */
export function Body({ scales, pose }: Props) {
  const { shoulder, waist, hip, thigh, calf, height, bulk } = scales;

  const headRx = Math.max(18, 22 * height * 0.92);
  const headRy = Math.max(22, 28 * height * 0.95);
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

  const thighLen = 58 * height;
  const calfLen = 52 * height;
  const dx = pose.stanceDx;
  const bonus = pose.legSpreadBonus ?? 0;
  /** Afastamento horizontal do joelho em px (antropometria + pose). */
  const kneeOut = 14 * thigh * bulk + bonus;

  const hipY = yHip;
  const kneeY = hipY + thighLen * 0.52;
  const ankleY = hipY + thighLen + calfLen * 0.88;
  const footY = ankleY + 12;

  const { hipL, hipR } = pose;

  const leftLegPath = `
    M ${hipL.x},${hipL.y}
    C ${hipL.x - kneeOut * 0.12 + dx * 0.08},${hipY + thighLen * 0.28} ${hipL.x - kneeOut * 0.88},${kneeY - 2} ${hipL.x - kneeOut * 0.95},${hipY + thighLen}
    C ${hipL.x - kneeOut * 1.02 - dx * 0.12},${hipY + thighLen + calfLen * 0.32} ${hipL.x - kneeOut * 1.08 - dx * 0.35},${ankleY} ${hipL.x - kneeOut * 1.05 - dx * 0.5},${footY}
  `.replace(/\s+/g, " ");

  const rightLegPath = `
    M ${hipR.x},${hipR.y}
    C ${hipR.x + kneeOut * 0.12 - dx * 0.08},${hipY + thighLen * 0.28} ${hipR.x + kneeOut * 0.88},${kneeY - 2} ${hipR.x + kneeOut * 0.95},${hipY + thighLen}
    C ${hipR.x + kneeOut * 1.02 + dx * 0.12},${hipY + thighLen + calfLen * 0.32} ${hipR.x + kneeOut * 1.08 + dx * 0.35},${ankleY} ${hipR.x + kneeOut * 1.05 + dx * 0.5},${footY}
  `.replace(/\s+/g, " ");

  const thighStroke = Math.max(11, 12.5 * thigh * bulk);
  const calfStroke = Math.max(9, 10.5 * calf * bulk);
  const armStroke = Math.max(8.2, 6.8 * scales.arm * bulk);

  const al = pose.shoulderL;
  const ar = pose.shoulderR;
  const armLen = pose.armLen;

  const leftArmPath = `
    M ${al.x},${al.y}
    Q ${al.x - 8},${al.y + armLen * 0.42} ${al.x - 3},${al.y + armLen}
  `.replace(/\s+/g, " ");

  const rightArmPath = `
    M ${ar.x},${ar.y}
    Q ${ar.x + 8},${ar.y + armLen * 0.42} ${ar.x + 3},${ar.y + armLen}
  `.replace(/\s+/g, " ");

  const tt = pose.torsoDeg !== 0 ? `rotate(${pose.torsoDeg}, ${pose.torsoPivot.x}, ${pose.torsoPivot.y})` : undefined;
  const legLt = pose.legLdeg !== 0 ? `rotate(${pose.legLdeg}, ${pose.hipL.x}, ${pose.hipL.y})` : undefined;
  const legRt = pose.legRdeg !== 0 ? `rotate(${pose.legRdeg}, ${pose.hipR.x}, ${pose.hipR.y})` : undefined;

  return (
    <g className="avatar-body" fill="var(--avatar-fill)" stroke="var(--avatar-stroke)" strokeOpacity={0.92}>
      <g transform={tt}>
        <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} strokeWidth={0.85} />
        <path d={neckPath} strokeWidth={0.65} />
        <path d={torsoPath} strokeWidth={1.05} />
        <g transform={`rotate(${pose.armLdeg}, ${al.x}, ${al.y})`}>
          <path d={leftArmPath} fill="none" strokeWidth={armStroke} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g transform={`rotate(${pose.armRdeg}, ${ar.x}, ${ar.y})`}>
          <path d={rightArmPath} fill="none" strokeWidth={armStroke} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <g transform={legLt}>
        <path d={leftLegPath} fill="none" strokeWidth={thighStroke + 1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <path d={leftLegPath} fill="none" strokeWidth={thighStroke} strokeLinecap="round" strokeLinejoin="round" />
        <path d={leftLegPath} fill="none" strokeWidth={calfStroke} strokeLinecap="round" strokeLinejoin="round" opacity={0.88} />
      </g>
      <g transform={legRt}>
        <path d={rightLegPath} fill="none" strokeWidth={thighStroke + 1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <path d={rightLegPath} fill="none" strokeWidth={thighStroke} strokeLinecap="round" strokeLinejoin="round" />
        <path d={rightLegPath} fill="none" strokeWidth={calfStroke} strokeLinecap="round" strokeLinejoin="round" opacity={0.88} />
      </g>
    </g>
  );
}
