/**
 * Zonas do corpo para registar dores e lesões (ordenadas da cabeça aos pés).
 * As chaves antigas (KNEE, ANKLE, SHOULDER, LOWER_BACK, NECK, HIPS, WRIST, OTHER) mantêm-se
 * para não perder registos existentes; as novas acrescentam os grupos musculares.
 */
export const PAIN_REGIONS = [
  { key: "NECK", labelPt: "Pescoço", labelEn: "Neck" },
  { key: "SHOULDER", labelPt: "Ombro", labelEn: "Shoulder" },
  { key: "TRAPEZIUS", labelPt: "Trapézio", labelEn: "Trapezius" },
  { key: "CHEST", labelPt: "Peito", labelEn: "Chest" },
  { key: "UPPER_BACK", labelPt: "Costas (parte alta)", labelEn: "Upper back" },
  { key: "LOWER_BACK", labelPt: "Lombar", labelEn: "Lower back" },
  { key: "ABDOMEN", labelPt: "Abdómen / costelas", labelEn: "Abdomen / ribs" },
  { key: "BICEPS", labelPt: "Braço — frente (bíceps)", labelEn: "Upper arm — front (biceps)" },
  { key: "TRICEPS", labelPt: "Braço — trás (tríceps)", labelEn: "Upper arm — back (triceps)" },
  { key: "ELBOW", labelPt: "Cotovelo", labelEn: "Elbow" },
  { key: "FOREARM", labelPt: "Antebraço", labelEn: "Forearm" },
  { key: "WRIST", labelPt: "Pulso / mão", labelEn: "Wrist / hand" },
  { key: "HIPS", labelPt: "Anca / quadril", labelEn: "Hip" },
  { key: "GLUTES", labelPt: "Glúteos", labelEn: "Glutes" },
  { key: "GROIN", labelPt: "Virilha / parte de dentro da coxa", labelEn: "Groin / inner thigh" },
  { key: "QUADRICEPS", labelPt: "Coxa — frente (quadríceps)", labelEn: "Thigh — front (quadriceps)" },
  { key: "HAMSTRING", labelPt: "Coxa — trás (isquiotibiais)", labelEn: "Thigh — back (hamstrings)" },
  { key: "KNEE", labelPt: "Joelho", labelEn: "Knee" },
  { key: "SHIN", labelPt: "Canela", labelEn: "Shin" },
  { key: "CALF", labelPt: "Gémeo / panturrilha", labelEn: "Calf" },
  { key: "ANKLE", labelPt: "Tornozelo", labelEn: "Ankle" },
  { key: "FOOT", labelPt: "Pé", labelEn: "Foot" },
  { key: "OTHER", labelPt: "Outra", labelEn: "Other" },
] as const;
