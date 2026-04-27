import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { MOBILITY_LABELS, POSTURAL_LABELS } from "@/lib/physical-assessment-types";

export type AnatomicalBodyMapRegionId =
  | "head"
  | "neck"
  | "chest"
  | "abdomen"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg"
  | "trapezius"
  | "upperBack"
  | "lowerBack"
  | "glutes";

export type AnatomicalBodyMapRow = { label: string; value: string };

function cm(n: number | null | undefined, locale: "pt" | "en"): string | null {
  if (n == null || Number.isNaN(n)) return null;
  const u = locale === "pt" ? "cm" : "cm";
  return `${n} ${u}`;
}

function pair(
  left: number | null | undefined,
  right: number | null | undefined,
  locale: "pt" | "en"
): string | null {
  const L = cm(left, locale);
  const R = cm(right, locale);
  if (!L && !R) return null;
  if (L && R) return locale === "pt" ? `${L} / ${R}` : `${L} / ${R}`;
  return L || R;
}

function bmi(heightCm: number | null | undefined, weightKg: number | null | undefined): number | null {
  if (heightCm == null || weightKg == null || heightCm <= 0) return null;
  const h = heightCm / 100;
  const v = weightKg / (h * h);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 10) / 10;
}

function posturalLines(
  codes: string[] | undefined,
  filter: Set<string>,
  locale: "pt" | "en"
): string | null {
  if (!Array.isArray(codes) || codes.length === 0) return null;
  const picked = codes.filter((c) => filter.has(c));
  if (picked.length === 0) return null;
  const labels = picked.map((c) => POSTURAL_LABELS[c] ?? c);
  return labels.join(locale === "pt" ? "; " : "; ");
}

function mobilityLine(
  codes: string[] | undefined,
  locale: "pt" | "en"
): string | null {
  if (!Array.isArray(codes) || codes.length === 0) return null;
  return codes.map((c) => MOBILITY_LABELS[c] ?? c).join(locale === "pt" ? "; " : "; ");
}

export function anatomicalBodyMapRegionLabels(locale: "pt" | "en"): Record<AnatomicalBodyMapRegionId, string> {
  if (locale === "en") {
    return {
      head: "Head",
      neck: "Neck",
      chest: "Chest",
      abdomen: "Abdomen",
      leftArm: "Left arm",
      rightArm: "Right arm",
      leftLeg: "Left leg",
      rightLeg: "Right leg",
      trapezius: "Trapezius",
      upperBack: "Upper back",
      lowerBack: "Lower back",
      glutes: "Hips / glutes",
    };
  }
  return {
    head: "Cabeça",
    neck: "Pescoço",
    chest: "Tórax",
    abdomen: "Abdómen",
    leftArm: "Braço esquerdo",
    rightArm: "Braço direito",
    leftLeg: "Perna esquerda",
    rightLeg: "Perna direita",
    trapezius: "Trapézio",
    upperBack: "Costas superiores",
    lowerBack: "Zona lombar",
    glutes: "Quadril / glúteos",
  };
}

/**
 * Métricas por região anatómica a partir da ficha (antropometria, notas de postura/mobilidade relevantes).
 */
export function buildAnatomicalBodyMapRegions(
  d: Partial<PhysicalAssessmentFormData>,
  locale: "pt" | "en"
): Record<AnatomicalBodyMapRegionId, AnatomicalBodyMapRow[]> {
  const rows: Record<AnatomicalBodyMapRegionId, AnatomicalBodyMapRow[]> = {
    head: [],
    neck: [],
    chest: [],
    abdomen: [],
    leftArm: [],
    rightArm: [],
    leftLeg: [],
    rightLeg: [],
    trapezius: [],
    upperBack: [],
    lowerBack: [],
    glutes: [],
  };

  const L = locale === "pt";

  const h = cm(d.circHeadCm, locale);
  if (h) rows.head.push({ label: L ? "Circunferência" : "Circumference", value: h });
  const headPost = posturalLines(d.posturalAssessment, new Set(["CABECA_ANTERIOR"]), locale);
  if (headPost) rows.head.push({ label: L ? "Postura" : "Posture", value: headPost });

  const nk = cm(d.circNeckCm, locale);
  if (nk) rows.neck.push({ label: L ? "Circunferência" : "Circumference", value: nk });

  const ch = cm(d.circChestCm, locale);
  if (ch) rows.chest.push({ label: L ? "Circunferência (tórax)" : "Chest girth", value: ch });
  const chestPost = posturalLines(d.posturalAssessment, new Set(["HIPERCIFOSE", "OMBROS_PROTRUIDOS"]), locale);
  if (chestPost) rows.chest.push({ label: L ? "Postura" : "Posture", value: chestPost });

  const ab = cm(d.circAbdomenCm, locale);
  if (ab) rows.abdomen.push({ label: L ? "Circunferência" : "Circumference", value: ab });

  const la = pair(d.circArmLeftCm, null, locale);
  if (la) rows.leftArm.push({ label: L ? "Braço (relax.)" : "Upper arm (relaxed)", value: la });
  const lb = pair(d.circBicepsLeftCm, null, locale);
  if (lb) rows.leftArm.push({ label: L ? "Bíceps" : "Biceps", value: lb });
  const lf = pair(d.circForearmLeftCm, null, locale);
  if (lf) rows.leftArm.push({ label: L ? "Antebraço" : "Forearm", value: lf });
  const llen = cm(d.lenArmShoulderFingertipLeftCm, locale);
  if (llen) rows.leftArm.push({ label: L ? "Comprimento ombro → dedo" : "Shoulder → fingertip length", value: llen });

  const ra = pair(d.circArmRightCm, null, locale);
  if (ra) rows.rightArm.push({ label: L ? "Braço (relax.)" : "Upper arm (relaxed)", value: ra });
  const rb = pair(d.circBicepsRightCm, null, locale);
  if (rb) rows.rightArm.push({ label: L ? "Bíceps" : "Biceps", value: rb });
  const rf = pair(d.circForearmRightCm, null, locale);
  if (rf) rows.rightArm.push({ label: L ? "Antebraço" : "Forearm", value: rf });
  const rlen = cm(d.lenArmShoulderFingertipRightCm, locale);
  if (rlen) rows.rightArm.push({ label: L ? "Comprimento ombro → dedo" : "Shoulder → fingertip length", value: rlen });

  const mobShoulder = Array.isArray(d.mobilityLimitations) && d.mobilityLimitations.includes("OMBRO");
  if (mobShoulder) {
    const note = L ? "Limitação referida: ombro" : "Noted limitation: shoulder";
    rows.leftArm.push({ label: L ? "Mobilidade" : "Mobility", value: note });
    rows.rightArm.push({ label: L ? "Mobilidade" : "Mobility", value: note });
  }

  const thighL = cm(d.circThighLeftCm, locale);
  if (thighL) rows.leftLeg.push({ label: L ? "Coxa" : "Thigh", value: thighL });
  const calfL = cm(d.circCalfLeftCm, locale);
  if (calfL) rows.leftLeg.push({ label: L ? "Panturrilha" : "Calf", value: calfL });
  const inseamL = cm(d.lenLegInseamLeftCm, locale);
  if (inseamL) rows.leftLeg.push({ label: L ? "Perna (entrepé)" : "Leg (inseam)", value: inseamL });

  const thighR = cm(d.circThighRightCm, locale);
  if (thighR) rows.rightLeg.push({ label: L ? "Coxa" : "Thigh", value: thighR });
  const calfR = cm(d.circCalfRightCm, locale);
  if (calfR) rows.rightLeg.push({ label: L ? "Panturrilha" : "Calf", value: calfR });
  const inseamR = cm(d.lenLegInseamRightCm, locale);
  if (inseamR) rows.rightLeg.push({ label: L ? "Perna (entrepé)" : "Leg (inseam)", value: inseamR });

  const footLen = cm(d.footLengthCm, locale);
  const shoe = d.shoeSizeBr?.trim();
  if (footLen) {
    rows.leftLeg.push({ label: L ? "Comprimento do pé" : "Foot length", value: footLen });
    rows.rightLeg.push({ label: L ? "Comprimento do pé" : "Foot length", value: footLen });
  }
  if (shoe) {
    rows.leftLeg.push({ label: L ? "Calçado (ref.)" : "Shoe size", value: shoe });
    rows.rightLeg.push({ label: L ? "Calçado (ref.)" : "Shoe size", value: shoe });
  }

  const legMobCodes = Array.isArray(d.mobilityLimitations)
    ? d.mobilityLimitations.filter((x) => x === "ANCA" || x === "JOELHO" || x === "TORNOZELO")
    : [];
  const legMobLine = mobilityLine(legMobCodes, locale);
  if (legMobLine) {
    const legNote = L ? "Mobilidade" : "Mobility";
    rows.leftLeg.push({ label: legNote, value: legMobLine });
    rows.rightLeg.push({ label: legNote, value: legMobLine });
  }

  const br = cm(d.breadthShoulderCm, locale);
  if (br) {
    rows.trapezius.push({ label: L ? "Largura ombros (biaquatorial)" : "Shoulder breadth (biacromial)", value: br });
    rows.upperBack.push({ label: L ? "Largura ombros (biaquatorial)" : "Shoulder breadth (biacromial)", value: br });
  }
  if (mobShoulder) {
    rows.trapezius.push({
      label: L ? "Mobilidade" : "Mobility",
      value: L ? "Limitação referida: ombro" : "Noted limitation: shoulder",
    });
  }
  const upperPost = posturalLines(d.posturalAssessment, new Set(["OMBROS_PROTRUIDOS", "HIPERCIFOSE", "ESCOLIOSE"]), locale);
  if (upperPost) rows.upperBack.push({ label: L ? "Postura" : "Posture", value: upperPost });

  const lowerPost = posturalLines(
    d.posturalAssessment,
    new Set(["HIPERLORDOSE", "ESCOLIOSE"]),
    locale
  );
  if (lowerPost) rows.lowerBack.push({ label: L ? "Postura" : "Posture", value: lowerPost });

  const hip = cm(d.circHipCm, locale);
  if (hip) rows.glutes.push({ label: L ? "Circunferência (quadril)" : "Hip girth", value: hip });

  return rows;
}

export function anatomicalBodyMapHasAnyRegionData(
  regions: Record<AnatomicalBodyMapRegionId, AnatomicalBodyMapRow[]>
): boolean {
  return (Object.values(regions) as AnatomicalBodyMapRow[][]).some((r) => r.length > 0);
}

export function anatomicalBodyMapOverall(
  d: Partial<PhysicalAssessmentFormData>,
  locale: "pt" | "en"
): { weightLabel: string; heightLabel: string; bmiLabel: string; weight?: string; height?: string; bmi?: string } {
  const L = locale === "pt";
  const w = d.weightKg != null ? `${d.weightKg} kg` : undefined;
  const h = d.heightCm != null ? `${d.heightCm} cm` : undefined;
  const b = bmi(d.heightCm, d.weightKg);
  const bStr = b != null ? String(b) : undefined;
  return {
    weightLabel: L ? "Peso" : "Weight",
    heightLabel: L ? "Altura" : "Height",
    bmiLabel: L ? "IMC" : "BMI",
    weight: w,
    height: h,
    bmi: bStr,
  };
}
