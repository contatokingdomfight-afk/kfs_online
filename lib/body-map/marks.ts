/**
 * Marcas no corpo do mapa corporal: dores registadas pelo aluno (Bem-estar › Dores), lesões antigas que o aluno
 * declara (fratura, distensão, entorse…) e as registadas na avaliação física. Aparecem em qualquer das 3 vistas.
 *
 * Esquerda/direita são sempre anatómicas (o lado do próprio aluno), em todas as vistas.
 */
import type { AnatomicalBodyMapRegionId } from "@/lib/anatomical-body-map-from-form";
import { PAIN_REGIONS } from "@/lib/pain-regions";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

export type BodyMarkKey = (typeof PAIN_REGIONS)[number]["key"];
export type BodySide = "LEFT" | "RIGHT" | "BOTH";

export type BodyMark = {
  id: string;
  kind: "pain" | "injury";
  key: BodyMarkKey;
  /** Lado do corpo; nulo/BOTH = os dois lados (ou zona central). */
  side?: BodySide | null;
  /** 1–10 (só dor). */
  intensity?: number;
  /** Lesão antiga já recuperada (desenhada mais suave). */
  recovered?: boolean;
  /** Linha para o painel da zona. */
  row: { label: string; value: string };
};

export type PainReportInput = { bodyRegion: string; intensity: number; reportedAt: string; side?: string | null };

/** Lesão declarada pelo aluno (tabela StudentInjury). */
export type StudentInjuryInput = {
  bodyRegion: string;
  side?: string | null;
  injuryType: string;
  occurredYear?: number | null;
  recovered?: boolean | null;
};

export const INJURY_TYPES = [
  { key: "FRACTURE", pt: "Fratura", en: "Fracture" },
  { key: "MUSCLE_STRAIN", pt: "Distensão muscular", en: "Muscle strain" },
  { key: "SPRAIN", pt: "Entorse", en: "Sprain" },
  { key: "LIGAMENT", pt: "Lesão ligamentar", en: "Ligament injury" },
  { key: "OTHER", pt: "Outra lesão", en: "Other injury" },
] as const;

export const BODY_SIDES = [
  { key: "LEFT", pt: "Esquerdo", en: "Left" },
  { key: "RIGHT", pt: "Direito", en: "Right" },
  { key: "BOTH", pt: "Ambos os lados", en: "Both sides" },
] as const;

type MapView = "front" | "back";
type Target = { regions: AnatomicalBodyMapRegionId[]; slugs: string[]; limb?: "Leg" | "Arm"; /** Só se vê nestas vistas (omitido = ambas). */ views?: MapView[] };

const LEGS: AnatomicalBodyMapRegionId[] = ["leftLeg", "rightLeg"];
const ARMS: AnatomicalBodyMapRegionId[] = ["leftArm", "rightArm"];

/** Onde cada zona de dor/lesão se desenha (regiões do mapa + músculos exatos da Visão muscular). */
const TARGETS: Record<BodyMarkKey, Target> = {
  NECK: { regions: ["neck", "trapezius"], slugs: ["neck", "trapezius"] },
  SHOULDER: { regions: ARMS, slugs: ["deltoids"], limb: "Arm" },
  TRAPEZIUS: { regions: ["neck", "trapezius"], slugs: ["trapezius"] },
  CHEST: { regions: ["chest"], slugs: ["chest"], views: ["front"] },
  UPPER_BACK: { regions: ["upperBack"], slugs: ["upper-back"], views: ["back"] },
  LOWER_BACK: { regions: ["lowerBack"], slugs: ["lower-back"], views: ["back"] },
  ABDOMEN: { regions: ["abdomen"], slugs: ["abs", "obliques"], views: ["front"] },
  BICEPS: { regions: ARMS, slugs: ["biceps"], limb: "Arm", views: ["front"] },
  TRICEPS: { regions: ARMS, slugs: ["triceps"], limb: "Arm", views: ["back"] },
  ELBOW: { regions: ARMS, slugs: ["forearm"], limb: "Arm" },
  FOREARM: { regions: ARMS, slugs: ["forearm"], limb: "Arm" },
  WRIST: { regions: ARMS, slugs: ["hands"], limb: "Arm" },
  HIPS: { regions: ["abdomen", "glutes"], slugs: ["gluteal"] },
  GLUTES: { regions: ["glutes"], slugs: ["gluteal"], views: ["back"] },
  GROIN: { regions: LEGS, slugs: ["adductors"], limb: "Leg" },
  QUADRICEPS: { regions: LEGS, slugs: ["quadriceps"], limb: "Leg", views: ["front"] },
  HAMSTRING: { regions: LEGS, slugs: ["hamstring"], limb: "Leg", views: ["back"] },
  KNEE: { regions: LEGS, slugs: ["knees"], limb: "Leg" },
  SHIN: { regions: LEGS, slugs: ["tibialis"], limb: "Leg", views: ["front"] },
  CALF: { regions: LEGS, slugs: ["calves"], limb: "Leg" },
  ANKLE: { regions: LEGS, slugs: ["ankles", "feet"], limb: "Leg" },
  FOOT: { regions: LEGS, slugs: ["feet"], limb: "Leg" },
  OTHER: { regions: [], slugs: [] },
};

const PAIN_COLOR = "#ef4444";
const INJURY_COLOR = "#8b5cf6";

export type RegionMarkStyle = { color: string; opacity: number; dashed: boolean; hasPain: boolean; hasInjury: boolean };

/** Regiões onde a marca se desenha (um só lado quando o aluno o indicou). */
function targetRegions(m: BodyMark, view?: MapView): AnatomicalBodyMapRegionId[] {
  const t = TARGETS[m.key];
  if (view && t.views && !t.views.includes(view)) return [];
  if (!t.limb || !m.side || m.side === "BOTH") return t.regions;
  const id = `${m.side === "LEFT" ? "left" : "right"}${t.limb}` as AnatomicalBodyMapRegionId;
  return [id];
}

export function marksForRegion(marks: readonly BodyMark[], region: AnatomicalBodyMapRegionId, view?: MapView): BodyMark[] {
  return marks.filter((m) => targetRegions(m, view).includes(region));
}

/** A marca acende este músculo (slug) da Visão muscular? */
export function markCoversPath(m: BodyMark, region: AnatomicalBodyMapRegionId | null, slug: string): boolean {
  if (!region) return false;
  return targetRegions(m).includes(region) && TARGETS[m.key].slugs.includes(slug);
}

/** Estilo agregado de uma região (dor = vermelho; só lesão = violeta tracejado). */
export function regionMarkStyle(marks: readonly BodyMark[], region: AnatomicalBodyMapRegionId, view?: MapView): RegionMarkStyle | null {
  const ms = marksForRegion(marks, region, view);
  if (ms.length === 0) return null;
  const pains = ms.filter((m) => m.kind === "pain");
  const injuries = ms.filter((m) => m.kind === "injury");
  if (pains.length > 0) {
    const max = Math.max(...pains.map((m) => m.intensity ?? 3));
    return { color: PAIN_COLOR, opacity: Math.min(0.85, 0.3 + max * 0.055), dashed: injuries.length > 0, hasPain: true, hasInjury: injuries.length > 0 };
  }
  const active = injuries.some((m) => !m.recovered);
  return { color: INJURY_COLOR, opacity: active ? 0.34 : 0.18, dashed: true, hasPain: false, hasInjury: true };
}

/** Cor e opacidade de uma marca num músculo concreto (Visão muscular). */
export function pathMarkStyle(
  marks: readonly BodyMark[],
  region: AnatomicalBodyMapRegionId | null,
  slug: string
): RegionMarkStyle | null {
  if (!region) return null;
  const hit = marks.filter((m) => markCoversPath(m, region, slug));
  if (hit.length === 0) return null;
  return regionMarkStyle(hit, region);
}

function keyFromText(region: string | undefined | null): BodyMarkKey | null {
  if (!region) return null;
  const raw = region.trim();
  if (!raw) return null;
  const direct = PAIN_REGIONS.find((r) => r.key === raw.toUpperCase());
  if (direct) return direct.key;
  const s = raw.toLowerCase();
  if (/isquio|hamstring|posterior da coxa/.test(s)) return "HAMSTRING";
  if (/quadr[ií]ceps|frente da coxa/.test(s)) return "QUADRICEPS";
  if (/gl[uú]teo|glute/.test(s)) return "GLUTES";
  if (/g[eé]meo|panturrilha|calf/.test(s)) return "CALF";
  if (/canela|shin/.test(s)) return "SHIN";
  if (/b[ií]ceps|biceps/.test(s)) return "BICEPS";
  if (/tr[ií]ceps|triceps/.test(s)) return "TRICEPS";
  if (/antebra|forearm/.test(s)) return "FOREARM";
  if (/cotovelo|elbow/.test(s)) return "ELBOW";
  if (/virilha|adutor|groin/.test(s)) return "GROIN";
  if (/peito|peitoral|chest/.test(s)) return "CHEST";
  if (/abd[oó]men|costela|rib/.test(s)) return "ABDOMEN";
  if (/trap[eé]zio|trapezius/.test(s)) return "TRAPEZIUS";
  if (/joelh|knee/.test(s)) return "KNEE";
  if (/tornoz|ankle|\bp[eé]s?\b/.test(s)) return "ANKLE";
  if (/ombr|shoulder|clav/.test(s)) return "SHOULDER";
  if (/lombar|costas|coluna|lower back|back/.test(s)) return "LOWER_BACK";
  if (/pesco|cervical|neck/.test(s)) return "NECK";
  if (/anca|quadril|bacia|hip/.test(s)) return "HIPS";
  if (/pulso|punho|m[aã]o|dedo|wrist|hand/.test(s)) return "WRIST";
  return null;
}

function toSide(v: string | null | undefined): BodySide | null {
  return v === "LEFT" || v === "RIGHT" || v === "BOTH" ? v : null;
}

function sideText(side: BodySide | null, locale: "pt" | "en"): string {
  if (!side) return "";
  const s = BODY_SIDES.find((x) => x.key === side);
  return s ? (locale === "pt" ? s.pt.toLowerCase() : s.en.toLowerCase()) : "";
}

function daysAgoText(iso: string, locale: "pt" | "en", now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = Math.max(0, Math.floor((now - t) / 86_400_000));
  if (locale === "pt") return d === 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`;
  return d === 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

export function painRegionLabel(key: string, locale: "pt" | "en"): string {
  const r = PAIN_REGIONS.find((x) => x.key === key);
  return r ? (locale === "pt" ? r.labelPt : r.labelEn) : key;
}

export function injuryTypeLabel(type: string | undefined | null, locale: "pt" | "en"): string {
  const t = INJURY_TYPES.find((x) => x.key === type);
  if (t) return locale === "pt" ? t.pt : t.en;
  return type?.trim() || (locale === "pt" ? "Lesão" : "Injury");
}

/** Junta dores recentes, lesões declaradas pelo aluno e lesões da ficha numa lista de marcas para o mapa. */
export function buildBodyMarks(args: {
  pains?: readonly PainReportInput[] | null;
  injuries?: PhysicalAssessmentFormData["injuries"] | null;
  studentInjuries?: readonly StudentInjuryInput[] | null;
  locale: "pt" | "en";
  now?: number;
}): BodyMark[] {
  const { locale } = args;
  const L = locale === "pt";
  const now = args.now ?? Date.now();
  const out: BodyMark[] = [];

  const bestPain = new Map<string, { key: BodyMarkKey; side: BodySide | null; p: PainReportInput }>();
  for (const p of args.pains ?? []) {
    const key = keyFromText(p.bodyRegion);
    if (!key || key === "OTHER") continue;
    const side = toSide(p.side);
    const k = `${key}-${side ?? "x"}`;
    const cur = bestPain.get(k);
    if (!cur || p.intensity > cur.p.intensity || (p.intensity === cur.p.intensity && p.reportedAt > cur.p.reportedAt)) bestPain.set(k, { key, side, p });
  }
  for (const [k, { key, side, p }] of bestPain) {
    const where = [painRegionLabel(key, locale), sideText(side, locale)].filter(Boolean).join(" ");
    out.push({
      id: `pain-${k}`,
      kind: "pain",
      key,
      side,
      intensity: p.intensity,
      row: {
        label: L ? "Dor registada" : "Reported pain",
        value: `${where} ${p.intensity}/10 · ${daysAgoText(p.reportedAt, locale, now)}`.replace(/ · $/, ""),
      },
    });
  }

  const pushInjury = (id: string, key: BodyMarkKey, side: BodySide | null, type: string | null | undefined, year: string | undefined, recovered: boolean | null | undefined) => {
    const status = recovered === true ? (L ? "recuperada" : "recovered") : recovered === false ? (L ? "por recuperar" : "not recovered") : "";
    out.push({
      id,
      kind: "injury",
      key,
      side,
      recovered: recovered === true,
      row: {
        label: L ? "Lesão anterior" : "Past injury",
        value: [injuryTypeLabel(type, locale), [painRegionLabel(key, locale), sideText(side, locale)].filter(Boolean).join(" "), year, status].filter(Boolean).join(" · "),
      },
    });
  };

  (args.studentInjuries ?? []).forEach((inj, i) => {
    const key = keyFromText(inj.bodyRegion);
    if (!key || key === "OTHER") return;
    pushInjury(`sinjury-${key}-${i}`, key, toSide(inj.side), inj.injuryType, inj.occurredYear ? String(inj.occurredYear) : undefined, inj.recovered);
  });

  (args.injuries ?? []).forEach((inj, i) => {
    const key = keyFromText(inj.region);
    if (!key || key === "OTHER") return;
    pushInjury(`injury-${key}-${i}`, key, null, inj.type, inj.year?.trim() || undefined, inj.recovered);
  });

  return out;
}

/** Músculo tocado na Visão muscular → zona de dor (para registar a dor a tocar no corpo). */
export const PAIN_KEY_BY_SLUG: Readonly<Record<string, BodyMarkKey>> = {
  neck: "NECK",
  trapezius: "TRAPEZIUS",
  deltoids: "SHOULDER",
  chest: "CHEST",
  "upper-back": "UPPER_BACK",
  "lower-back": "LOWER_BACK",
  abs: "ABDOMEN",
  obliques: "ABDOMEN",
  biceps: "BICEPS",
  triceps: "TRICEPS",
  forearm: "FOREARM",
  hands: "WRIST",
  gluteal: "GLUTES",
  adductors: "GROIN",
  abductors: "HIPS",
  quadriceps: "QUADRICEPS",
  hamstring: "HAMSTRING",
  knees: "KNEE",
  tibialis: "SHIN",
  calves: "CALF",
  ankles: "ANKLE",
  feet: "FOOT",
};
