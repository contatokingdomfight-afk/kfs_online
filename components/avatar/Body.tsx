import type { BodyScaleFactors } from "./avatar-utils";
import type { PoseLayout } from "./Pose";

export type BodyPaintIds = {
  head: string;
  torso: string;
  neck: string;
  limb: string;
  softShadow: string;
};

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  /** Gradientes / sombra definidos no `<svg><defs>` do pai (ex.: `Avatar`). */
  paintIds?: BodyPaintIds;
};

/**
 * Corpo em paths curvos; pernas com espessura mínima (evita “agulhas”);
 * afastamento do joelho em px real (não usar largura de stroke como coordenada).
 */
export function Body({ scales, pose, paintIds }: Props) {
  const { shoulder, chest, waist, hip, thigh, calf, height, bulk, legInseam } = scales;

  const headRx = Math.max(18, 22 * height * 0.92);
  const headRy = Math.max(22, 28 * height * 0.95);
  const cx = 100;
  const headCy = 52;

  const shW = 34 * shoulder * bulk * (0.78 + 0.22 * chest);
  const wW = 22 * waist * bulk;
  /** Cintura vs anca: ligeiro reforço visual do ratio (ilustrativo). */
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

  const neckPath = `
    M ${cx - shW * 0.42},${yNeck}
    Q ${cx},${yNeck + 10} ${cx + shW * 0.42},${yNeck}
    L ${cx + shW * 0.38},${yShoulder - 4}
    Q ${cx},${yShoulder + 2} ${cx - shW * 0.38},${yShoulder - 4}
    Z
  `.replace(/\s+/g, " ");

  const legLenMul = 0.82 + 0.18 * legInseam;
  const thighLen = 58 * height * legLenMul;
  const calfLen = 52 * height * legLenMul;
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

  const fillHead = paintIds ? `url(#${paintIds.head})` : "var(--avatar-fill)";
  const fillTorso = paintIds ? `url(#${paintIds.torso})` : "var(--avatar-fill)";
  const fillNeck = paintIds ? `url(#${paintIds.neck})` : "var(--avatar-fill)";
  const strokeLimb = paintIds ? `url(#${paintIds.limb})` : "var(--avatar-stroke)";
  const softFilter = paintIds ? `url(#${paintIds.softShadow})` : undefined;

  return (
    <g
      className="avatar-body"
      fill={paintIds ? undefined : "var(--avatar-fill)"}
      stroke={paintIds ? undefined : "var(--avatar-stroke)"}
      strokeOpacity={paintIds ? undefined : 0.92}
      filter={softFilter}
    >
      <g transform={tt} fill={fillTorso} stroke="var(--avatar-stroke)" strokeOpacity={0.92}>
        <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} fill={fillHead} strokeWidth={0.85} />
        <path d={neckPath} fill={fillNeck} strokeWidth={0.65} />
        <path d={torsoPath} strokeWidth={1.05} />
        <g transform={`rotate(${pose.armLdeg}, ${al.x}, ${al.y})`}>
          <path d={leftArmPath} fill="none" stroke={strokeLimb} strokeWidth={armStroke} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g transform={`rotate(${pose.armRdeg}, ${ar.x}, ${ar.y})`}>
          <path d={rightArmPath} fill="none" stroke={strokeLimb} strokeWidth={armStroke} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <g transform={legLt} stroke={strokeLimb}>
        <path d={leftLegPath} fill="none" strokeWidth={thighStroke + 1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <path d={leftLegPath} fill="none" strokeWidth={thighStroke} strokeLinecap="round" strokeLinejoin="round" />
        <path d={leftLegPath} fill="none" strokeWidth={calfStroke} strokeLinecap="round" strokeLinejoin="round" opacity={0.88} />
      </g>
      <g transform={legRt} stroke={strokeLimb}>
        <path d={rightLegPath} fill="none" strokeWidth={thighStroke + 1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <path d={rightLegPath} fill="none" strokeWidth={thighStroke} strokeLinecap="round" strokeLinejoin="round" />
        <path d={rightLegPath} fill="none" strokeWidth={calfStroke} strokeLinecap="round" strokeLinejoin="round" opacity={0.88} />
      </g>
    </g>
  );
}
