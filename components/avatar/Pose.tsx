import type { Modality } from "./avatar-utils";

/** Âncoras e rotações por modalidade (graus, px de deslocamento). */
export type PoseLayout = {
  modality: Modality;
  /** Rotação do grupo do torso (graus, pivô em cx,cy). */
  torsoDeg: number;
  torsoPivot: { x: number; y: number };
  /** Abertura horizontal dos pés (metade do deslocamento por lado). */
  stanceDx: number;
  /** Ombro esquerdo / direito — pivôs para braços. */
  shoulderL: { x: number; y: number };
  shoulderR: { x: number; y: number };
  /** Rotação braço esq/dir (graus), positivo = sentido horário no SVG. */
  armLdeg: number;
  armRdeg: number;
  /** Comprimento visual do braço (antes de escala de medida). */
  armLen: number;
  /** Posição aproximada das mãos (para luvas / wraps) em coords do viewBox. */
  handL: { x: number; y: number };
  handR: { x: number; y: number };
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

/**
 * Calcula pose: braços como hastes a partir do ombro com rotação.
 * viewBox 200×400; figura centrada em x≈100.
 */
export function getPoseLayout(modality: Modality, armLenBase: number): PoseLayout {
  const armLen = armLenBase;
  const sl = { x: 78, y: 108 };
  const sr = { x: 122, y: 108 };

  if (modality === "boxing") {
    const armLdeg = -58;
    const armRdeg = 58;
    const hl = rotatePoint(sl.x, sl.y + armLen, sl.x, sl.y, armLdeg);
    const hr = rotatePoint(sr.x, sr.y + armLen, sr.x, sr.y, armRdeg);
    return {
      modality,
      torsoDeg: 0,
      torsoPivot: { x: 100, y: 130 },
      stanceDx: 0,
      shoulderL: sl,
      shoulderR: sr,
      armLdeg,
      armRdeg,
      armLen,
      handL: hl,
      handR: hr,
    };
  }

  if (modality === "muay_thai") {
    const armLdeg = -42;
    const armRdeg = 42;
    const hl = rotatePoint(sl.x, sl.y + armLen * 0.95, sl.x, sl.y, armLdeg);
    const hr = rotatePoint(sr.x, sr.y + armLen * 0.95, sr.x, sr.y, armRdeg);
    return {
      modality,
      torsoDeg: 0,
      torsoPivot: { x: 100, y: 130 },
      stanceDx: 14,
      shoulderL: sl,
      shoulderR: sr,
      armLdeg,
      armRdeg,
      armLen: armLen * 1.02,
      handL: hl,
      handR: hr,
    };
  }

  /* bjj */
  const armLdeg = -102;
  const armRdeg = 102;
  const hl = rotatePoint(sl.x - 8, sl.y + armLen * 1.05, sl.x, sl.y, armLdeg);
  const hr = rotatePoint(sr.x + 8, sr.y + armLen * 1.05, sr.x, sr.y, armRdeg);
  return {
    modality,
    torsoDeg: 14,
    torsoPivot: { x: 100, y: 125 },
    stanceDx: 6,
    shoulderL: sl,
    shoulderR: sr,
    armLdeg,
    armRdeg,
    armLen: armLen * 1.08,
    handL: hl,
    handR: hr,
  };
}

/** Marcador sem geometria extra — útil para testes / acessibilidade futura. */
export function Pose({ type }: { type: Modality }) {
  return <g data-avatar-pose={type} aria-hidden />;
}

/** Posição das mãos no espaço do viewBox (após rotação do torso, se existir). */
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
