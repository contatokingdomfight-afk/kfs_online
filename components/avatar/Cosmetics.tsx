import type { BodyScaleFactors } from "./avatar-utils";
import type { PoseLayout } from "./Pose";
import type { AvatarCosmeticConfig } from "@/lib/avatar-cosmetics";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  avatarConfig?: AvatarCosmeticConfig;
  /** Cor hex da faixa do aluno (lib/belt-colors.ts); só usada com `avatarConfig.showBeltSash`. */
  beltColor?: string;
};

/**
 * Camada de cosméticos de gamificação (bandana + faixa visível), separada de `Equipment`
 * (que é sobre equipamento por modalidade). Recalcula um pequeno subconjunto das
 * referências de posição que `Body.tsx` já usa (cabeça/cintura) para se manter alinhada
 * — se a geometria de `Body.tsx` mudar bastante, revê estes números também.
 */
export function Cosmetics({ scales, pose, avatarConfig, beltColor }: Props) {
  if (!avatarConfig) return null;
  const { headband, showBeltSash } = avatarConfig;

  const isVitruvian = pose.poseTag === "star";
  const headMul = isVitruvian ? 0.88 : 1;
  const headRx = Math.max(16, 20 * scales.height * 0.92) * headMul;
  const headRy = Math.max(20, 25 * scales.height * 0.95) * headMul;
  const cx = 100;
  const headCy = 52;

  const wW = 22 * scales.waist * scales.bulk;
  const wh = Math.min(Math.max(scales.waist / Math.max(scales.hip, 0.01), 0.75), 1.32);
  const wWAdjusted = wW * (0.92 + 0.08 * wh);
  const yWaist = 158;

  const showHeadband = headband && headband !== "headband_none";
  const isChampion = headband === "headband_champion";

  return (
    <g className="avatar-cosmetics">
      {showHeadband && (
        <g>
          <path
            d={`M ${cx - headRx * 0.92},${headCy - headRy * 0.18} Q ${cx},${headCy - headRy * 0.32} ${cx + headRx * 0.92},${headCy - headRy * 0.18} L ${cx + headRx * 0.92},${headCy + headRy * 0.02} Q ${cx},${headCy - headRy * 0.12} ${cx - headRx * 0.92},${headCy + headRy * 0.02} Z`}
            fill={isChampion ? "#d4af37" : "#b91c1c"}
            fillOpacity={0.92}
            stroke="var(--avatar-stroke)"
            strokeWidth={0.5}
          />
          {isChampion && (
            <circle cx={cx} cy={headCy - headRy * 0.16} r={Math.max(3, headRx * 0.06)} fill="#fff7d6" stroke="#b8860b" strokeWidth={0.6} />
          )}
        </g>
      )}
      {showBeltSash && beltColor && (
        <rect
          x={cx - wWAdjusted * 1.02}
          y={yWaist - 9}
          width={wWAdjusted * 2.04}
          height={18}
          rx={4}
          fill={beltColor}
          fillOpacity={0.95}
          stroke="var(--avatar-stroke)"
          strokeWidth={0.5}
        />
      )}
    </g>
  );
}
