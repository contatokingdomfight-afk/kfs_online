/**
 * Vista «Silhueta» do mapa corporal: contorno vetorial deformado zona a zona pelas medidas do aluno.
 * Geometria em coordenadas 200×400 (corpo de referência masculino; a feminina aplica fatores base).
 */
import type { AnatomicalBodyMapRegionId } from "@/lib/anatomical-body-map-from-form";
import { bodyFactors, clampNum, type BodyFactors, type BodyMeasures, type BodySex } from "@/lib/body-map/measures";
import { smoothClosedPath } from "@/lib/body-map/path-utils";

export type SilhouetteView = "front" | "back";
export type Ellipse = { cx: number; cy: number; rx: number; ry: number };
export type LinePath = { d: string; mirror: boolean };
export type SilhouetteZone = { region: AnatomicalBodyMapRegionId; ds: string[] };

export type SilhouetteModel = {
  body: string;
  lines: LinePath[];
  defLines: LinePath[];
  hl: Ellipse[];
  defHl: Ellipse[];
  zones: SilhouetteZone[];
  shadowRx: number;
};

const FEMALE_BASE: BodyFactors = { sh: 0.88, chest: 0.93, waist: 0.84, hip: 1.07, arm: 0.84, fore: 0.84, thigh: 1, calf: 0.95 };

export function silhouetteFactors(m: BodyMeasures, sex: BodySex): BodyFactors {
  const F = bodyFactors(m, sex);
  if (sex === "m") return F;
  return {
    sh: F.sh * FEMALE_BASE.sh,
    chest: F.chest * FEMALE_BASE.chest,
    waist: F.waist * FEMALE_BASE.waist,
    hip: F.hip * FEMALE_BASE.hip,
    arm: F.arm * FEMALE_BASE.arm,
    fore: F.fore * FEMALE_BASE.fore,
    thigh: F.thigh * FEMALE_BASE.thigh,
    calf: F.calf * FEMALE_BASE.calf,
  };
}

type Pt = [number, number];

/** Metade esquerda do contorno (cabeça → virilha); a direita é espelhada. */
const HALF: Pt[] = [
  [100, 6], [90, 8], [84, 15], [82, 25], [82, 32], [80, 34], [80.5, 41], [83, 43], [85, 48], [90, 54], [95, 57],
  [94, 62], [93, 67], [86, 70], [76, 73], [68, 76],
  [61, 80], [57, 87], [56, 95], [54, 106], [51, 118], [48, 130], [45, 142], [41, 156], [37, 172], [33, 188], [31, 198],
  [28, 206], [26, 215], [27, 224], [30, 231], [34, 233], [37, 228], [37, 218], [38, 208],
  [40, 200], [44, 186], [49, 170], [53, 154], [57, 140], [60, 126], [62, 114], [65, 104],
  [68, 112], [70, 124], [72, 140], [73, 152], [72, 164], [70, 178], [68, 192],
  [67, 206], [67, 224], [69, 244], [72, 262], [75, 280], [75, 292], [73, 304], [73, 318], [75, 334], [78, 352], [80, 366], [80, 374],
  [77, 382], [76, 389], [80, 393], [92, 393], [95, 388], [93, 380], [92, 370],
  [92, 354], [93, 336], [93, 318], [93, 300], [94, 284], [95, 262], [97, 240], [100, 222],
];
const mirrorPts = (h: Pt[]): Pt[] => h.concat(h.slice(1, -1).reverse().map(([x, y]): Pt => [200 - x, y]));
const PTS = mirrorPts(HALF);

const HAIR_HALF: Pt[] = [[100, 3], [87, 6], [78, 16], [75, 31], [75, 48], [73, 62], [71, 74], [79, 77], [86, 68], [92, 62], [100, 64]];
/** Cabelo comprido (massa atrás da cabeça/ombros) — figura feminina. */
export const FEMALE_HAIR_BEHIND_D = smoothClosedPath(mirrorPts(HAIR_HALF));
/** Risca e madeixas que enquadram a cara — figura feminina, vista frontal. */
export const FEMALE_HAIR_FRONT_DS = [
  "M82 34 C79 14 90 5 100 5 C110 5 121 14 118 34 C116 24 111 18 100 17 C89 18 84 24 82 34 Z",
  "M82 34 C80 46 81 56 78 68 L85 66 C86 56 85 46 87 34 Z",
  "M118 34 C120 46 119 56 122 68 L115 66 C114 56 115 46 113 34 Z",
];

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

type Force = "torso" | "arm" | "leg" | undefined;

function regionAt(x: number, y: number): "head" | "torso" | "arm" | "leg" {
  if (y < 57) return "head";
  const b = y < 130 ? 65 : 65 - (y - 130) * 0.2;
  if (y >= 78 && y <= 236 && x < b) return "arm";
  return y >= 218 ? "leg" : "torso";
}

export function morphSilhouettePoint(x: number, y: number, F: BodyFactors, force?: Force): Pt {
  if (Math.abs(x - 100) < 0.01) return [100, y];
  const left = x < 100;
  const xl = left ? x : 200 - x;
  const r = force ?? regionAt(xl, y);
  let nx = xl;
  if (r === "torso") {
    nx = 100 - (100 - xl) * knots(y, [[64, 1], [74, F.sh], [105, F.chest], [150, F.waist], [192, F.hip], [214, (F.hip + F.thigh) / 2]]);
  } else if (r === "arm") {
    const yy = clampNum(y, 80, 205);
    const ax = 58 + ((35 - 58) * (yy - 90)) / 108;
    const fa = knots(y, [[100, F.arm], [140, F.arm], [160, F.fore], [196, F.fore], [204, 1]]);
    nx = ax + (xl - ax) * fa - (100 - 64) * (F.sh - 1);
  } else if (r === "leg") {
    const lx = 82.5 + (y - 238) * 0.02;
    const fl = knots(y, [[214, F.thigh], [262, F.thigh], [290, (F.thigh + F.calf) / 2], [310, F.calf], [350, F.calf], [370, 1]]);
    nx = Math.min(lx + (xl - lx) * fl - (100 - lx) * (F.hip - 1), 99.6);
  }
  return [left ? nx : 200 - nx, y];
}

const PAIR_RE = /(-?\d+(?:\.\d+)?)([ ,])(-?\d+(?:\.\d+)?)/g;

/** Deforma todos os pares x,y de um `d` simples (M/L/Q/C absolutos). */
function morphD(d: string, F: BodyFactors, force?: Force): string {
  return d.replace(PAIR_RE, (_s, a: string, sep: string, b: string) => {
    const [x, y] = morphSilhouettePoint(Number(a), Number(b), F, force);
    return `${x.toFixed(1)}${sep}${y}`;
  });
}

function polygonD(points: string): string {
  const p = points.trim().split(/\s+/);
  return `M${p.join(" L")}Z`;
}

const ARM_L = "5,72 62,72 62,80 65,100 64,130 51,200 50,240 5,240";
const ARM_R = "195,72 138,72 138,80 135,100 136,130 149,200 150,240 195,240";

type Anat = {
  lines: string[];
  defLines: string[];
  defCenter: string[];
  center: string[];
  male: string[];
  female: string[];
  hl: Array<[number, number, number, number]>;
  defHl: Array<[number, number, number, number]>;
};

const ANAT: Record<SilhouetteView, Anat> = {
  front: {
    lines: ["M90 68 Q80 71 70 76", "M92 57 Q95 64 98 70", "M65 80 Q70 94 64 108", "M60 112 Q56 124 56 138", "M50 148 Q53 151 55 150", "M48 156 Q44 170 40 186", "M76 124 Q80 134 77 146", "M71 226 Q78 254 80 282", "M90 236 Q88 262 89 278", "M83 288 Q88 281 92 289 Q88 297 83 293", "M80 306 Q84 322 85 342", "M29 216 L30 226", "M32 218 L33 228"],
    defLines: ["M74 146 Q84 176 97 198", "M94 116 Q93 150 95 184"],
    defCenter: ["M100 112 L100 165", "M89 126 Q100 129 111 126", "M89 141 Q100 144 111 141", "M90 156 Q100 159 110 156"],
    center: ["M100 76 L100 111", "M86 52 Q100 60 114 52"],
    male: ["M69 104 Q84 118 99 111"],
    female: ["M70 97 Q74 117 89 116 Q96 114 99 106"],
    hl: [[84, 94, 12, 8], [59, 90, 5, 9], [55, 124, 4, 9], [44, 170, 3, 10], [81, 254, 7, 22], [80, 322, 4, 13], [100, 30, 11, 14]],
    defHl: [[94, 120, 4, 5], [94, 134, 4, 5], [94, 148, 4, 5]],
  },
  back: {
    lines: ["M64 82 Q70 96 64 108", "M57 108 Q53 124 54 140", "M50 148 Q53 151 55 150", "M69 200 Q84 191 99 199", "M68 232 Q84 242 99 234", "M84 244 L86 282", "M78 290 Q86 294 93 290", "M80 302 Q86 316 86 334", "M87 300 Q93 314 90 332", "M84 360 L86 380"],
    defLines: ["M70 76 Q86 92 100 122", "M74 96 Q86 97 91 108 Q87 122 76 127", "M68 112 Q80 142 97 170", "M95 128 Q93 156 96 186"],
    defCenter: [],
    center: ["M100 62 L100 196", "M100 200 L100 228"],
    male: [],
    female: [],
    hl: [[88, 78, 9, 5], [82, 110, 9, 11], [59, 90, 5, 9], [54, 122, 4, 10], [44, 170, 3, 10], [85, 212, 12, 11], [83, 262, 7, 18], [82, 318, 5, 13], [100, 28, 13, 16]],
    defHl: [[78, 140, 6, 14], [95, 160, 3, 16]],
  },
};

type ZoneDef = { region: AnatomicalBodyMapRegionId; polys: string[]; force?: Force };

const ZONE_DEFS: Record<SilhouetteView, ZoneDef[]> = {
  front: [
    { region: "head", polys: ["0,0 200,0 200,57 0,57"] },
    { region: "neck", polys: ["78,57 122,57 122,70 78,70"] },
    { region: "chest", polys: ["62,70 138,70 138,80 134,100 134,118 66,118 66,100 62,80"] },
    { region: "abdomen", polys: ["66,118 134,118 134,182 66,182", "50,182 150,182 150,222 50,222"] },
    { region: "rightArm", polys: [ARM_L], force: "arm" },
    { region: "leftArm", polys: [ARM_R], force: "arm" },
    { region: "rightLeg", polys: ["40,222 100,222 100,400 40,400"], force: "leg" },
    { region: "leftLeg", polys: ["160,222 100,222 100,400 160,400"], force: "leg" },
  ],
  back: [
    { region: "head", polys: ["0,0 200,0 200,57 0,57"] },
    { region: "trapezius", polys: ["62,57 138,57 138,80 120,92 80,92 62,80"] },
    { region: "upperBack", polys: ["66,80 80,92 120,92 134,80 134,140 66,140"] },
    { region: "lowerBack", polys: ["66,140 134,140 134,190 66,190"] },
    { region: "glutes", polys: ["50,190 150,190 150,236 50,236"] },
    { region: "leftArm", polys: [ARM_L], force: "arm" },
    { region: "rightArm", polys: [ARM_R], force: "arm" },
    { region: "leftLeg", polys: ["40,236 100,236 100,400 40,400"], force: "leg" },
    { region: "rightLeg", polys: ["160,236 100,236 100,400 160,400"], force: "leg" },
  ],
};

function ellipseOf([cx, cy, rx, ry]: [number, number, number, number], F: BodyFactors): Ellipse[] {
  const [x] = morphSilhouettePoint(cx, cy, F);
  const [x2] = morphSilhouettePoint(cx + rx, cy, F);
  const r = Math.abs(x2 - x) || rx;
  const one = (xx: number): Ellipse => ({ cx: Number(xx.toFixed(1)), cy, rx: Number(r.toFixed(1)), ry });
  return cx !== 100 ? [one(x), one(200 - x)] : [one(x)];
}

export function buildSilhouetteModel(view: SilhouetteView, sex: BodySex, F: BodyFactors): SilhouetteModel {
  const A = ANAT[view];
  const body = smoothClosedPath(PTS.map(([x, y]) => morphSilhouettePoint(x, y, F)));
  const mirrored = (ds: string[]): LinePath[] => ds.flatMap((d) => { const q = morphD(d, F); return [{ d: q, mirror: false }, { d: q, mirror: true }]; });
  const centered = (ds: string[]): LinePath[] => ds.map((d) => ({ d: morphD(d, F), mirror: false }));
  const lines = [...mirrored(A.lines), ...mirrored(sex === "f" ? A.female : A.male), ...centered(A.center)];
  const defLines = [...mirrored(A.defLines), ...centered(A.defCenter)];
  const hl = A.hl.flatMap((e) => ellipseOf(e, F));
  if (sex === "f" && view === "front") hl.push(...ellipseOf([86, 104, 10, 8], F));
  const defHl = A.defHl.flatMap((e) => ellipseOf(e, F));
  const zones: SilhouetteZone[] = ZONE_DEFS[view].map((z) => ({
    region: z.region,
    ds: z.polys.map((p) => morphD(polygonD(p), F, z.force)),
  }));
  return { body, lines, defLines, hl, defHl, zones, shadowRx: Number((46 * F.hip).toFixed(1)) };
}
