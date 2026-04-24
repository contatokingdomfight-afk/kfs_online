import type { Modality, PoseTag } from "./avatar-utils";

export type PoseContext = {
  cx: number;
  yHip: number;
  halfHipW: number;
};

/** Âncoras, rotações e extras de pernas (spread em px, não confundir com stroke). */
export type PoseLayout = {
  modality: Modality;
  poseTag: PoseTag;
  torsoDeg: number;
  torsoPivot: { x: number; y: number };
  stanceDx: number;
  shoulderL: { x: number; y: number };
  shoulderR: { x: number; y: number };
  armLdeg: number;
  armRdeg: number;
  armLen: number;
  handL: { x: number; y: number };
  handR: { x: number; y: number };
  hipL: { x: number; y: number };
  hipR: { x: number; y: number };
  /** Rotação da perna inteira em torno da anca (graus). */
  legLdeg: number;
  legRdeg: number;
  /** Soma em px ao afastamento do joelho (fora do eixo do corpo). */
  legSpreadBonus: number;
};

const DEG = Math.PI / 180;

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  deg: number
): { x: number; y: number } {
  const r = deg * DEG;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function handsFromArms(
  sl: { x: number; y: number },
  sr: { x: number; y: number },
  armLdeg: number,
  armRdeg: number,
  armLen: number,
  wristBiasL: { x: number; y: number },
  wristBiasR: { x: number; y: number }
): { handL: { x: number; y: number }; handR: { x: number; y: number } } {
  const hl = rotatePoint(sl.x + wristBiasL.x, sl.y + armLen + wristBiasL.y, sl.x, sl.y, armLdeg);
  const hr = rotatePoint(sr.x + wristBiasR.x, sr.y + armLen + wristBiasR.y, sr.x, sr.y, armRdeg);
  return { handL: hl, handR: hr };
}

/**
 * `poseTag === "star"` → braços e pernas bem abertos (independente da modalidade para o corpo).
 * `auto` → guarda típica por modalidade (equipamento continua a seguir `modality`).
 */
export function getPoseLayout(
  modality: Modality,
  armLenBase: number,
  poseTag: PoseTag,
  ctx: PoseContext
): PoseLayout {
  const { cx, yHip, halfHipW } = ctx;
  const hipL = { x: cx - halfHipW * 0.52, y: yHip };
  const hipR = { x: cx + halfHipW * 0.52, y: yHip };
  const torsoPivot = { x: cx, y: 128 };

  if (poseTag === "star") {
    const sl = { x: 66, y: 104 };
    const sr = { x: 134, y: 104 };
    const armLen = armLenBase * 0.82;
    const armLdeg = -122;
    const armRdeg = 122;
    const { handL, handR } = handsFromArms(sl, sr, armLdeg, armRdeg, armLen, { x: -2, y: 0 }, { x: 2, y: 0 });
    return {
      modality,
      poseTag,
      torsoDeg: 0,
      torsoPivot,
      stanceDx: 52,
      shoulderL: sl,
      shoulderR: sr,
      armLdeg,
      armRdeg,
      armLen,
      handL,
      handR,
      hipL,
      hipR,
      legLdeg: -28,
      legRdeg: 28,
      legSpreadBonus: 38,
    };
  }

  /* auto — por modalidade */
  const sl = { x: 71, y: 106 };
  const sr = { x: 129, y: 106 };
  const armLen = armLenBase * 0.9;

  if (modality === "boxing") {
    const armLdeg = -50;
    const armRdeg = 50;
    const { handL, handR } = handsFromArms(sl, sr, armLdeg, armRdeg, armLen, { x: -1, y: 0 }, { x: 1, y: 0 });
    return {
      modality,
      poseTag,
      torsoDeg: 0,
      torsoPivot,
      stanceDx: 6,
      shoulderL: sl,
      shoulderR: sr,
      armLdeg,
      armRdeg,
      armLen,
      handL,
      handR,
      hipL,
      hipR,
      legLdeg: 0,
      legRdeg: 0,
      legSpreadBonus: 4,
    };
  }

  if (modality === "muay_thai") {
    const armLdeg = -40;
    const armRdeg = 40;
    const { handL, handR } = handsFromArms(sl, sr, armLdeg, armRdeg, armLen * 0.98, { x: -1, y: 0 }, { x: 1, y: 0 });
    return {
      modality,
      poseTag,
      torsoDeg: 0,
      torsoPivot,
      stanceDx: 18,
      shoulderL: sl,
      shoulderR: sr,
      armLdeg,
      armRdeg,
      armLen: armLen * 0.98,
      handL,
      handR,
      hipL,
      hipR,
      legLdeg: -6,
      legRdeg: 6,
      legSpreadBonus: 10,
    };
  }

  /* bjj */
  const armLdeg = -98;
  const armRdeg = 98;
  const { handL, handR } = handsFromArms(sl, sr, armLdeg, armRdeg, armLen * 1.05, { x: -6, y: 4 }, { x: 6, y: 4 });
  return {
    modality,
    poseTag,
    torsoDeg: 12,
    torsoPivot: { x: cx, y: 122 },
    stanceDx: 10,
    shoulderL: sl,
    shoulderR: sr,
    armLdeg,
    armRdeg,
    armLen: armLen * 1.05,
    handL,
    handR,
    hipL,
    hipR,
    legLdeg: -4,
    legRdeg: 4,
    legSpreadBonus: 6,
  };
}

export function Pose({ type, poseTag }: { type: Modality; poseTag: PoseTag }) {
  return <g data-avatar-modality={type} data-avatar-pose-tag={poseTag} aria-hidden />;
}

export function getWorldHandPositions(pose: PoseLayout): { handL: { x: number; y: number }; handR: { x: number; y: number } } {
  if (!pose.torsoDeg) {
    return { handL: { ...pose.handL }, handR: { ...pose.handR } };
  }
  const { torsoDeg, torsoPivot } = pose;
  return {
    handL: rotatePoint(pose.handL.x, pose.handL.y, torsoPivot.x, torsoPivot.y, torsoDeg),
    handR: rotatePoint(pose.handR.x, pose.handR.y, torsoPivot.x, torsoPivot.y, torsoDeg),
  };
}
