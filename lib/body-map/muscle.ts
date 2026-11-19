/**
 * Vista «Visão muscular» do mapa corporal: manequim muscular (cada músculo é um caminho SVG com nome),
 * normalizado para 200×400 e deformado zona a zona pelas medidas do aluno.
 * Dados: react-native-body-highlighter (MIT) — ver THIRD_PARTY_NOTICES.md.
 */
import type { AnatomicalBodyMapRegionId } from "@/lib/anatomical-body-map-from-form";
import { MUSCLE_BODY_DATA, type MuscleBodyKey } from "@/components/physical-assessment/generated/muscle-body-data";
import { clampNum, type BodyFactors, type BodySex } from "@/lib/body-map/measures";
import { parsePathD, segsToD, type Seg } from "@/lib/body-map/path-utils";

export type MuscleView = "front" | "back";

export function muscleBodyKey(sex: BodySex, view: MuscleView): MuscleBodyKey {
  if (sex === "f") return view === "front" ? "bodyFemaleFront" : "bodyFemaleBack";
  return view === "front" ? "bodyFront" : "bodyBack";
}

type BBox = { x0: number; x1: number; y0: number; y1: number };
type Cal = {
  shY: number;
  chestY: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  kneeY: number;
  calfC: number;
  ankleY: number;
  elbowY: number;
  wristY: number;
  dtY: number;
  axd: (y: number) => number;
  lxd: (y: number) => number;
};
type Item = { slug: string; segs: Seg[] };
type FigureData = { items: Item[]; cal: Cal };

const EMPTY: BBox = { x0: 100, x1: 100, y0: 200, y1: 200 };
const cy = (b: BBox) => (b.y0 + b.y1) / 2;
const cx = (b: BBox) => (b.x0 + b.x1) / 2;
const lerp = (y: number, y0: number, v0: number, y1: number, v1: number) => v0 + (v1 - v0) * clampNum((y - y0) / (y1 - y0 || 1), 0, 1);

function knots(y: number, k: ReadonlyArray<readonly [number, number]>): number {
  if (y <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (y <= k[i][0]) {
      const [a, fa] = k[i - 1];
      const [b, fb] = k[i];
      return fa + ((fb - fa) * (y - a)) / (b - a);
    }
  }
  return k[k.length - 1][1];
}

function calibrate(bb: Record<string, BBox>, bbL: Record<string, BBox>): Cal {
  const g = (o: Record<string, BBox>, k: string): BBox => o[k] ?? EMPTY;
  const front = Boolean(bb.chest);
  const shY = g(bb, "deltoids").y0 + 8;
  const chestY = front ? cy(g(bb, "chest")) : cy(g(bb, "upper-back"));
  const waistY = front ? cy(g(bb, "abs")) : cy(g(bb, "lower-back"));
  const crotchY = front ? (bb.adductors ? bb.adductors.y0 + 10 : g(bb, "abs").y1 + 20) : g(bb, "gluteal").y1;
  const hipY = front ? waistY + (crotchY - waistY) * 0.75 : cy(g(bb, "gluteal"));
  const kneeY = front ? cy(g(bb, "knees")) : g(bb, "hamstring").y1;
  const calfC = cy(g(bb, "calves"));
  const ankleY = (bb.feet ?? bb.ankles ?? EMPTY).y0;
  const elbowY = g(bb, "forearm").y0;
  const wristY = g(bb, "forearm").y1;
  const handY = cy(g(bb, "hands"));
  const dX = 100 - cx(g(bbL, "deltoids"));
  const hX = 100 - cx(g(bbL, "hands"));
  const dY = cy(g(bbL, "deltoids"));
  const legTop = bbL.quadriceps ?? g(bbL, "hamstring");
  const lX0 = 100 - cx(legTop);
  const lX1 = 100 - cx(bbL.feet ?? g(bbL, "ankles"));
  return {
    shY,
    chestY,
    waistY,
    hipY,
    crotchY,
    kneeY,
    calfC,
    ankleY,
    elbowY,
    wristY,
    dtY: g(bb, "deltoids").y0,
    axd: (y) => lerp(y, dY, dX, handY, hX),
    lxd: (y) => lerp(y, crotchY, lX0, ankleY, lX1),
  };
}

const cache = new Map<MuscleBodyKey, FigureData>();

function endpoint(s: Seg): [number, number] | null {
  if (s.c === "Z") return null;
  return [s.p[s.p.length - 2], s.p[s.p.length - 1]];
}

function prepare(key: MuscleBodyKey): FigureData {
  const hit = cache.get(key);
  if (hit) return hit;
  const raw: Item[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [slug, paths] of MUSCLE_BODY_DATA[key]) {
    for (const d of paths) {
      const segs = parsePathD(d);
      for (const s of segs) {
        const e = endpoint(s);
        if (!e) continue;
        minX = Math.min(minX, e[0]);
        maxX = Math.max(maxX, e[0]);
        minY = Math.min(minY, e[1]);
        maxY = Math.max(maxY, e[1]);
      }
      raw.push({ slug, segs });
    }
  }
  const scale = 387 / (maxY - minY);
  const mid = (minX + maxX) / 2;
  const bb: Record<string, BBox> = {};
  const bbL: Record<string, BBox> = {};
  const add = (o: Record<string, BBox>, k: string, x: number, y: number) => {
    const b = o[k] ?? (o[k] = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
    b.x0 = Math.min(b.x0, x);
    b.x1 = Math.max(b.x1, x);
    b.y0 = Math.min(b.y0, y);
    b.y1 = Math.max(b.y1, y);
  };
  const items: Item[] = raw.map((it) => {
    const segs = it.segs.map((s): Seg => {
      if (s.c === "Z") return s;
      const p: number[] = [];
      for (let k = 0; k < s.p.length; k += 2) p.push(100 + (s.p[k] - mid) * scale, 6 + (s.p[k + 1] - minY) * scale);
      return { c: s.c, p };
    });
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const s of segs) {
      const e = endpoint(s);
      if (!e) continue;
      x0 = Math.min(x0, e[0]);
      x1 = Math.max(x1, e[0]);
      y0 = Math.min(y0, e[1]);
      y1 = Math.max(y1, e[1]);
    }
    const c = (x0 + x1) / 2;
    for (const [x, y] of [[x0, y0], [x1, y1]] as const) {
      add(bb, it.slug, x, y);
      if (c < 100) add(bbL, it.slug, x, y);
    }
    return { slug: it.slug, segs };
  });
  const out = { items, cal: calibrate(bb, bbL) };
  cache.set(key, out);
  return out;
}

const ARM = new Set(["deltoids", "biceps", "triceps", "forearm", "hands"]);
const LEG = new Set(["quadriceps", "adductors", "knees", "tibialis", "calves", "ankles", "feet", "hamstring", "abductors"]);
const FIXED = new Set(["head", "hair"]);

function morph(cal: Cal, slug: string, x: number, y: number, F: BodyFactors): [number, number] {
  if (FIXED.has(slug)) return [x, y];
  const dx = x - 100;
  const sg = dx < 0 ? -1 : 1;
  const ad = Math.abs(dx);
  const ft = knots(y, [[cal.shY - 24, 1], [cal.shY, F.sh], [cal.chestY, F.chest], [cal.waistY, F.waist], [cal.hipY, F.hip], [cal.crotchY, (F.hip + F.thigh) / 2], [cal.crotchY + 30, 1]]);
  if (ARM.has(slug)) {
    const a = cal.axd(y);
    const fa = knots(y, [[cal.dtY, F.sh], [cal.dtY + 40, F.arm], [cal.elbowY - 6, F.arm], [cal.elbowY + 10, F.fore], [cal.wristY - 4, F.fore], [cal.wristY + 10, 1]]);
    return [100 + sg * (a + (ad - a) * fa + a * (ft - 1) * 0.7), y];
  }
  if (LEG.has(slug)) {
    const a = cal.lxd(y);
    const fl = knots(y, [[cal.crotchY, F.thigh], [cal.kneeY - 14, F.thigh], [cal.kneeY, (F.thigh + F.calf) / 2], [cal.calfC, F.calf], [cal.ankleY - 10, F.calf], [cal.ankleY + 6, 1]]);
    const taper = 0.5 + 0.5 * clampNum(1 - (y - cal.crotchY) / (cal.ankleY - cal.crotchY), 0, 1);
    return [100 + sg * Math.max(a + (ad - a) * fl + a * (F.hip - 1) * taper, 1.5), y];
  }
  return [100 + dx * ft, y];
}

/** Região do mapa a que pertence cada músculo (esquerda/direita = lado anatómico do aluno). */
export function muscleRegion(slug: string, view: MuscleView, screenLeft: boolean): AnatomicalBodyMapRegionId | null {
  switch (slug) {
    case "head":
    case "hair":
      return "head";
    case "neck":
    case "trapezius":
      return view === "front" ? "neck" : "trapezius";
    case "chest":
      return "chest";
    case "abs":
    case "obliques":
      return "abdomen";
    case "upper-back":
      return "upperBack";
    case "lower-back":
      return "lowerBack";
    case "gluteal":
      return "glutes";
    default:
      // Esquerda/direita anatómicas: na vista frontal o lado esquerdo do aluno fica à direita do ecrã.
      const anatomicLeft = view === "front" ? !screenLeft : screenLeft;
      if (ARM.has(slug)) return anatomicLeft ? "leftArm" : "rightArm";
      if (LEG.has(slug)) return anatomicLeft ? "leftLeg" : "rightLeg";
      return null;
  }
}

export type MusclePath = { d: string; slug: string; region: AnatomicalBodyMapRegionId | null };

/** Caminhos prontos a desenhar; `factors = null` devolve o corpo base sem deformação. */
export function buildMusclePaths(key: MuscleBodyKey, factors: BodyFactors | null): MusclePath[] {
  const { items, cal } = prepare(key);
  const view: MuscleView = key.endsWith("Front") ? "front" : "back";
  return items.map((it) => {
    let sum = 0;
    let n = 0;
    const segs = it.segs.map((s): Seg => {
      if (s.c === "Z") return s;
      const p: number[] = [];
      for (let k = 0; k < s.p.length; k += 2) {
        const [x, y] = factors ? morph(cal, it.slug, s.p[k], s.p[k + 1], factors) : [s.p[k], s.p[k + 1]];
        p.push(x, y);
      }
      sum += p[p.length - 2];
      n += 1;
      return { c: s.c, p };
    });
    const centerX = n ? sum / n : 100;
    return { d: segsToD(segs), slug: it.slug, region: muscleRegion(it.slug, view, centerX < 100) };
  });
}
