/**
 * Referências pedagógicas para sinais vitais na ficha de avaliação física.
 * Não substituem avaliação clínica — guia de triagem para o coach.
 *
 * PA repouso (adultos 18+): critérios alinhados a AHA/ESC e SBC (normal <120/<80;
 * pré-hipertensão 120–139 ou 80–89; HT estágio 1: 140–159 ou 90–99; HT estágio 2+: ≥160 ou ≥100).
 * PA em atividade: resposta esperada (PAS sobe, PAD estável) e alertas de segurança (SBC / teste de esforço).
 * FC repouso juvenil: faixas aproximadas (Fleming et al., 2011). Adultos: 60–100 bpm (atletas 40–60).
 * FC em atividade leve-moderada: ~50–70 % da FC máx. estimada (220 − idade).
 */

export type VitalSignSeverity = "ok" | "caution" | "warning" | "critical";

export type VitalSignEvaluation = {
  severity: VitalSignSeverity;
  /** @deprecated use severity */
  status: "ok" | "attention" | "unknown";
  labelPt: string;
  detailPt: string;
};

export type BloodPressureRestCategory =
  | "normal"
  | "prehypertension"
  | "hypertension_stage1"
  | "hypertension_stage2";

export type VitalSignsReference = {
  ageYears: number | null;
  ageLabelPt: string;
  isAdult: boolean;
  restingHr: { okMin: number; okMax: number; athleticMax: number; notePt: string };
  activityHr: { okMin: number; okMax: number; highThreshold: number; notePt: string };
  bloodPressureRestNotePt: string;
  spo2: { okMin: number; borderlineMin: number; notePt: string };
};

export type DoubleProductReading = {
  labelPt: string;
  value: number;
  hr: number;
  systolic: number;
};

export type VitalSignsSafety = {
  blockMaxEffortTests: boolean;
  bannerPt: string | null;
  restBpCategory: BloodPressureRestCategory | null;
};

/** FC repouso normal (bpm) por idade — 9 a 18 anos. */
const RESTING_HR_BY_AGE: Record<number, { okMin: number; okMax: number }> = {
  9: { okMin: 65, okMax: 105 },
  10: { okMin: 63, okMax: 102 },
  11: { okMin: 60, okMax: 100 },
  12: { okMin: 58, okMax: 98 },
  13: { okMin: 55, okMax: 95 },
  14: { okMin: 55, okMax: 92 },
  15: { okMin: 52, okMax: 90 },
  16: { okMin: 50, okMax: 88 },
  17: { okMin: 50, okMax: 85 },
  18: { okMin: 50, okMax: 100 },
};

function clampScreeningAge(ageYears: number): number {
  if (ageYears < 9) return 9;
  if (ageYears > 18) return 18;
  return Math.floor(ageYears);
}

function estimatedMaxHr(ageYears: number): number {
  return Math.max(120, 220 - ageYears);
}

function toLegacyStatus(severity: VitalSignSeverity): VitalSignEvaluation["status"] {
  if (severity === "ok") return "ok";
  if (severity === "caution") return "attention";
  return "attention";
}

function evalResult(severity: VitalSignSeverity, labelPt: string, detailPt: string): VitalSignEvaluation {
  return { severity, status: toLegacyStatus(severity), labelPt, detailPt };
}

export function getVitalSignsReference(ageYears: number | null): VitalSignsReference {
  const isAdult = ageYears == null || ageYears >= 18;

  if (ageYears == null || ageYears < 0) {
    return {
      ageYears: null,
      ageLabelPt: "idade não indicada",
      isAdult: true,
      restingHr: {
        okMin: 60,
        okMax: 100,
        athleticMax: 50,
        notePt: "Adultos: 60–100 bpm em repouso (atletas podem estar 40–60).",
      },
      activityHr: {
        okMin: 100,
        okMax: 140,
        highThreshold: 170,
        notePt: "Esforço leve-moderado: ~50–70 % da FC máx. estimada (220 − idade).",
      },
      bloodPressureRestNotePt:
        "Adultos (SBC/AHA): normal PAS <120 e PAD <80; pré-hipertensão 120–139 ou 80–89; HT estágio 1: 140–159 ou 90–99; HT estágio 2+: ≥160 ou ≥100.",
      spo2: { okMin: 95, borderlineMin: 93, notePt: "Em ar ambiente: ≥95 % habitual." },
    };
  }

  const tableAge = isAdult ? 18 : clampScreeningAge(ageYears);
  const hr = RESTING_HR_BY_AGE[tableAge] ?? RESTING_HR_BY_AGE[18];
  const resting = isAdult
    ? {
        okMin: 60,
        okMax: 100,
        athleticMax: 40,
        notePt: "Adultos (19+): 60–100 bpm em repouso; atletas treinados podem estar 40–60 bpm.",
      }
    : {
        okMin: hr.okMin,
        okMax: hr.okMax,
        athleticMax: 50,
        notePt: `Jovens (${ageYears} anos): faixa habitual de triagem ${hr.okMin}–${hr.okMax} bpm em repouso.`,
      };

  const maxHr = estimatedMaxHr(ageYears);
  const activity = {
    okMin: Math.round(maxHr * 0.5),
    okMax: Math.round(maxHr * 0.7),
    highThreshold: Math.round(maxHr * 0.85),
    notePt: `Após aquecimento ou teste leve: esperado ~${Math.round(maxHr * 0.5)}–${Math.round(maxHr * 0.7)} bpm (50–70 % de FC máx. ≈ ${maxHr} bpm).`,
  };

  const bpNote = isAdult
    ? "Adultos (SBC/AHA): normal PAS <120 e PAD <80; pré-hipertensão 120–139 ou 80–89; HT estágio 1: 140–159 ou 90–99; HT estágio 2+: ≥160 ou ≥100 — bloqueia testes de esforço máximo."
    : ageYears < 13
      ? "Crianças: triagem simplificada (<110/70 ideal); percentis por altura/idade são o padrão clínico pediátrico."
      : "Adolescentes: triagem simplificada (<120/80 ideal); confirma com critérios pediátricos se limítrofe.";

  return {
    ageYears,
    ageLabelPt: `${ageYears} anos`,
    isAdult,
    restingHr: resting,
    activityHr: activity,
    bloodPressureRestNotePt: bpNote,
    spo2: {
      okMin: 95,
      borderlineMin: 93,
      notePt: "Saturação em ar ambiente: ≥95 % habitual para qualquer idade.",
    },
  };
}

export function classifyRestingBloodPressureAdult(
  systolic: number,
  diastolic: number
): { category: BloodPressureRestCategory; evaluation: VitalSignEvaluation } {
  if (systolic >= 160 || diastolic >= 100) {
    return {
      category: "hypertension_stage2",
      evaluation: evalResult(
        "critical",
        "Hipertensão estágio 2/3",
        `${systolic}/${diastolic} mmHg (≥160 sistólica ou ≥100 diastólica). CRÍTICO: não iniciar teste de esforço máximo — encaminhar ao médico.`
      ),
    };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      category: "hypertension_stage1",
      evaluation: evalResult(
        "warning",
        "Hipertensão estágio 1",
        `${systolic}/${diastolic} mmHg. Treino apenas leve/moderado e monitorado; avaliação médica recomendada.`
      ),
    };
  }
  if (systolic >= 120 || diastolic >= 80) {
    return {
      category: "prehypertension",
      evaluation: evalResult(
        "caution",
        "Pré-hipertensão / elevada",
        `${systolic}/${diastolic} mmHg (PAS 120–139 ou PAD 80–89). Liberado com atenção à intensidade.`
      ),
    };
  }
  return {
    category: "normal",
    evaluation: evalResult(
      "ok",
      "Normal",
      `${systolic}/${diastolic} mmHg (PAS <120 e PAD <80). Liberado para avaliação completa.`
    ),
  };
}

export function classifyRestingBloodPressurePediatric(
  systolic: number,
  diastolic: number,
  ageYears: number
): { category: BloodPressureRestCategory; evaluation: VitalSignEvaluation } {
  const child = ageYears < 13;
  const sysMax = child ? 110 : 120;
  const diaMax = child ? 70 : 80;
  const alertSys = child ? 120 : 130;
  const alertDia = child ? 80 : 85;

  if (systolic >= 160 || diastolic >= 100) {
    return {
      category: "hypertension_stage2",
      evaluation: evalResult(
        "critical",
        "Pressão muito elevada",
        `${systolic}/${diastolic} mmHg — valor crítico para a idade. Não realizar testes de esforço máximo; encaminhar.`
      ),
    };
  }
  if (systolic >= alertSys || diastolic >= alertDia) {
    return {
      category: "hypertension_stage1",
      evaluation: evalResult(
        "warning",
        "Acima do esperado para a idade",
        `${systolic}/${diastolic} mmHg acima da triagem habitual (<${sysMax}/${diaMax}). Confirma com percentis pediátricos.`
      ),
    };
  }
  if (systolic < sysMax && diastolic < diaMax) {
    return {
      category: "normal",
      evaluation: evalResult(
        "ok",
        "Dentro da triagem",
        `${systolic}/${diastolic} mmHg abaixo de ${sysMax}/${diaMax} mmHg para ${ageYears} anos.`
      ),
    };
  }
  return {
    category: "prehypertension",
    evaluation: evalResult(
      "caution",
      "Limítrofe",
      `${systolic}/${diastolic} mmHg próximo do limite (${sysMax}/${diaMax}). Repete em repouso.`
    ),
  };
}

export function evaluateRestingHeartRate(bpm: number, ref: VitalSignsReference): VitalSignEvaluation {
  const { okMin, okMax, athleticMax } = ref.restingHr;
  if (bpm >= athleticMax && bpm < okMin) {
    return evalResult(
      "ok",
      "Dentro do esperado (atleta)",
      `FC baixa mas compatível com boa forma cardiovascular (${bpm} bpm; atletas podem estar ${athleticMax}–${okMin - 1} bpm).`
    );
  }
  if (bpm >= okMin && bpm <= okMax) {
    return evalResult("ok", "Dentro do esperado", `${bpm} bpm está na faixa ${okMin}–${okMax} bpm para ${ref.ageLabelPt}.`);
  }
  if (bpm < athleticMax) {
    return evalResult(
      "warning",
      "Abaixo do habitual",
      `${bpm} bpm está abaixo do habitual (<${athleticMax} bpm). Se houver sintomas, considera encaminhar.`
    );
  }
  if (bpm > okMax && bpm <= okMax + 15) {
    return evalResult(
      "caution",
      "Ligeiramente elevada",
      `${bpm} bpm um pouco acima da faixa ${okMin}–${okMax} bpm. Repete em repouso ou regista contexto.`
    );
  }
  return evalResult(
    "warning",
    "Elevada",
    `${bpm} bpm claramente acima da faixa habitual (>${okMax} bpm). Avalia antes de treino intenso.`
  );
}

export function evaluateActivityHeartRate(bpm: number, ref: VitalSignsReference): VitalSignEvaluation {
  const { okMin, okMax, highThreshold } = ref.activityHr;
  if (bpm >= okMin && bpm <= okMax) {
    return evalResult(
      "ok",
      "Compatível com esforço leve-moderado",
      `${bpm} bpm na zona esperada (${okMin}–${okMax} bpm).`
    );
  }
  if (bpm < okMin) {
    return evalResult(
      "ok",
      "Baixa para o teste",
      `${bpm} bpm abaixo da zona típica (${okMin}–${okMax} bpm) — esforço muito leve ou recuperação rápida.`
    );
  }
  if (bpm <= highThreshold) {
    return evalResult(
      "caution",
      "Moderada a intensa",
      `${bpm} bpm acima da zona leve-moderada (${okMax} bpm). Regista o contexto do teste.`
    );
  }
  return evalResult(
    "warning",
    "Alta para esforço leve",
    `${bpm} bpm sugere esforço intenso (>${highThreshold} bpm). Confirma o protocolo do teste.`
  );
}

export function parseBloodPressure(raw: string): { systolic: number; diastolic: number } | null {
  const m = raw.trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!m) return null;
  const systolic = parseInt(m[1], 10);
  const diastolic = parseInt(m[2], 10);
  if (systolic < 70 || systolic > 250 || diastolic < 40 || diastolic > 150) return null;
  if (diastolic >= systolic) return null;
  return { systolic, diastolic };
}

export function evaluateRestingBloodPressure(
  raw: string,
  ref: VitalSignsReference
): { category: BloodPressureRestCategory; evaluation: VitalSignEvaluation } | null {
  const bp = parseBloodPressure(raw);
  if (!bp) return null;
  if (ref.isAdult) return classifyRestingBloodPressureAdult(bp.systolic, bp.diastolic);
  if (ref.ageYears != null) return classifyRestingBloodPressurePediatric(bp.systolic, bp.diastolic, ref.ageYears);
  return classifyRestingBloodPressureAdult(bp.systolic, bp.diastolic);
}

export type ActivityBpContext = {
  ageYears: number | null;
  referenceSex?: "F" | "M" | null;
  restBpRaw?: string | null;
};

/** PA durante esforço — alertas de segurança (SBC / ergometria). */
export function evaluateActivityBloodPressure(
  raw: string,
  ctx: ActivityBpContext
): VitalSignEvaluation | null {
  const activity = parseBloodPressure(raw);
  if (!activity) return null;

  const { systolic, diastolic } = activity;
  const age = ctx.ageYears ?? 30;
  const isFemaleOrElderly = ctx.referenceSex === "F" || age >= 60;
  const sysAlert = isFemaleOrElderly ? 210 : 220;

  const rest = ctx.restBpRaw ? parseBloodPressure(ctx.restBpRaw) : null;
  if (rest && systolic < rest.systolic - 10) {
    return evalResult(
      "critical",
      "Queda da PAS no esforço",
      `PAS em esforço (${systolic} mmHg) abaixo da de repouso (${rest.systolic} mmHg). Alerta severo — suspende teste e avalia clinicamente.`
    );
  }

  if (systolic > sysAlert) {
    return evalResult(
      "critical",
      "PAS hiperreativa no esforço",
      `PAS ${systolic} mmHg em esforço (limite de alerta >${sysAlert} mmHg). Interrompe teste de esforço.`
    );
  }

  if (diastolic > 110) {
    return evalResult(
      "critical",
      "PAD elevada no esforço",
      `PAD ${diastolic} mmHg em esforço (>110 mmHg). Vasoconstrição inadequada — interrompe teste.`
    );
  }

  if (diastolic > 105) {
    return evalResult(
      "warning",
      "PAD limítrofe no esforço",
      `PAD ${diastolic} mmHg em esforço (>105 mmHg). Monitoriza de perto.`
    );
  }

  if (rest) {
    const sysRise = systolic - rest.systolic;
    if (sysRise >= 20 && diastolic <= rest.diastolic + 10) {
      return evalResult(
        "ok",
        "Resposta normal",
        `PAS subiu ${sysRise} mmHg (${rest.systolic}→${systolic}); PAD estável (±10 mmHg). Resposta compatível com esforço.`
      );
    }
    if (sysRise < 10) {
      return evalResult(
        "caution",
        "Subida limitada da PAS",
        `PAS subiu apenas ${sysRise} mmHg. Confirma intensidade do teste ou técnica de medição.`
      );
    }
  }

  if (systolic >= 160 && systolic <= sysAlert && diastolic <= 90) {
    return evalResult(
      "ok",
      "Dentro da resposta esperada",
      `${systolic}/${diastolic} mmHg em esforço — PAS entre 160–${sysAlert} mmHg pode ser normal em esforço máximo.`
    );
  }

  return evalResult(
    "caution",
    "Registado",
    `${systolic}/${diastolic} mmHg em esforço. Compara com repouso e regista o protocolo do teste.`
  );
}

export function computeDoubleProduct(hr: number, systolic: number): number {
  return Math.round(hr * systolic);
}

export function parseSpo2Percent(raw: string): number | null {
  const cleaned = raw.trim().replace(/%/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 50 || n > 100) return null;
  return n;
}

export function evaluateSpo2(raw: string, ref: VitalSignsReference): VitalSignEvaluation | null {
  const pct = parseSpo2Percent(raw);
  if (pct == null) return null;
  if (pct >= ref.spo2.okMin) {
    return evalResult("ok", "Dentro do esperado", `${pct}% — habitual ≥${ref.spo2.okMin}%.`);
  }
  if (pct >= ref.spo2.borderlineMin) {
    return evalResult(
      "caution",
      "Limítrofe",
      `${pct}% entre ${ref.spo2.borderlineMin}–${ref.spo2.okMin - 1}%. Repete medição.`
    );
  }
  return evalResult(
    "critical",
    "Baixa",
    `${pct}% abaixo de ${ref.spo2.borderlineMin}%. Suspende esforço e avalia clinicamente.`
  );
}

export type VitalSignsFormSnapshot = {
  heartRateRest?: number | null;
  heartRateActivity?: number | null;
  bloodPressure?: string | null;
  bloodPressureActivity?: string | null;
  saturationO2?: string | null;
  referenceSex?: "F" | "M" | null;
};

export type VitalSignsEvaluationResult = {
  reference: VitalSignsReference;
  restingHr: VitalSignEvaluation | null;
  activityHr: VitalSignEvaluation | null;
  restingBp: { category: BloodPressureRestCategory; evaluation: VitalSignEvaluation } | null;
  activityBp: VitalSignEvaluation | null;
  spo2: VitalSignEvaluation | null;
  doubleProductRest: DoubleProductReading | null;
  doubleProductActivity: DoubleProductReading | null;
  safety: VitalSignsSafety;
};

function buildSafety(
  restingBp: { category: BloodPressureRestCategory; evaluation: VitalSignEvaluation } | null,
  activityBp: VitalSignEvaluation | null,
  spo2: VitalSignEvaluation | null
): VitalSignsSafety {
  const critical =
    restingBp?.category === "hypertension_stage2" ||
    restingBp?.evaluation.severity === "critical" ||
    activityBp?.severity === "critical" ||
    spo2?.severity === "critical";

  if (critical) {
    const reason =
      restingBp?.category === "hypertension_stage2"
        ? restingBp.evaluation.detailPt
        : activityBp?.severity === "critical"
          ? activityBp.detailPt
          : spo2?.detailPt ?? "Valor crítico nos sinais vitais.";
    return {
      blockMaxEffortTests: true,
      bannerPt: reason,
      restBpCategory: restingBp?.category ?? null,
    };
  }

  return {
    blockMaxEffortTests: false,
    bannerPt: null,
    restBpCategory: restingBp?.category ?? null,
  };
}

export function evaluateVitalSigns(
  snapshot: VitalSignsFormSnapshot,
  ageYears: number | null
): VitalSignsEvaluationResult {
  const reference = getVitalSignsReference(ageYears);

  const restingBp = snapshot.bloodPressure?.trim()
    ? evaluateRestingBloodPressure(snapshot.bloodPressure, reference)
    : null;

  const activityBp = snapshot.bloodPressureActivity?.trim()
    ? evaluateActivityBloodPressure(snapshot.bloodPressureActivity, {
        ageYears,
        referenceSex: snapshot.referenceSex,
        restBpRaw: snapshot.bloodPressure,
      })
    : null;

  const restBpParsed = snapshot.bloodPressure ? parseBloodPressure(snapshot.bloodPressure) : null;
  const actBpParsed = snapshot.bloodPressureActivity ? parseBloodPressure(snapshot.bloodPressureActivity) : null;

  const doubleProductRest =
    typeof snapshot.heartRateRest === "number" &&
    snapshot.heartRateRest > 0 &&
    restBpParsed
      ? {
          labelPt: "Duplo produto repouso (FC × PAS)",
          value: computeDoubleProduct(snapshot.heartRateRest, restBpParsed.systolic),
          hr: snapshot.heartRateRest,
          systolic: restBpParsed.systolic,
        }
      : null;

  const doubleProductActivity =
    typeof snapshot.heartRateActivity === "number" &&
    snapshot.heartRateActivity > 0 &&
    actBpParsed
      ? {
          labelPt: "Duplo produto em atividade (FC × PAS)",
          value: computeDoubleProduct(snapshot.heartRateActivity, actBpParsed.systolic),
          hr: snapshot.heartRateActivity,
          systolic: actBpParsed.systolic,
        }
      : null;

  const spo2 = snapshot.saturationO2?.trim() ? evaluateSpo2(snapshot.saturationO2, reference) : null;

  return {
    reference,
    restingHr:
      typeof snapshot.heartRateRest === "number" && snapshot.heartRateRest > 0
        ? evaluateRestingHeartRate(snapshot.heartRateRest, reference)
        : null,
    activityHr:
      typeof snapshot.heartRateActivity === "number" && snapshot.heartRateActivity > 0
        ? evaluateActivityHeartRate(snapshot.heartRateActivity, reference)
        : null,
    restingBp,
    activityBp,
    spo2,
    doubleProductRest,
    doubleProductActivity,
    safety: buildSafety(restingBp, activityBp, spo2),
  };
}

/** Compat: avaliação simples de PA repouso (legado). */
export function evaluateBloodPressure(raw: string, ref: VitalSignsReference): VitalSignEvaluation | null {
  return evaluateRestingBloodPressure(raw, ref)?.evaluation ?? null;
}
