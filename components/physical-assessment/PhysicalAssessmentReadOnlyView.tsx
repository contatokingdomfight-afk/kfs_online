import type { ReactNode, ReactElement } from "react";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import {
  OBJECTIVE_OPTIONS,
  MEDICAL_CONDITIONS_LABELS,
  ACTIVITY_LEVELS,
  MOBILITY_LABELS,
  POSTURAL_LABELS,
  CLEARANCE_OPTIONS,
} from "@/lib/physical-assessment-types";

function simNao(v: boolean | undefined | null, locale: "pt" | "en"): string {
  if (v === true) return locale === "pt" ? "Sim" : "Yes";
  if (v === false) return locale === "pt" ? "Não" : "No";
  return "—";
}

function clearanceLabel(value: string, locale: "pt" | "en"): string {
  const o = CLEARANCE_OPTIONS.find((c) => c.value === value);
  if (o) return o.label;
  return value || "—";
}

function section(title: string, children: ReactNode, key?: string): ReactElement {
  return (
    <section
      key={key}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-2"
    >
      <h2 className="text-base font-semibold text-[var(--text-primary)] m-0 border-b border-[var(--border)] pb-2">
        {title}
      </h2>
      <div className="text-sm text-[var(--text-primary)] space-y-1.5">{children}</div>
    </section>
  );
}

function line(label: string, value: ReactNode): ReactElement {
  return (
    <p className="m-0 flex flex-wrap gap-x-2 gap-y-1">
      <span className="text-[var(--text-secondary)] shrink-0">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </p>
  );
}

type Props = {
  formData: Partial<PhysicalAssessmentFormData>;
  clearance: string;
  assessedAt: string;
  nextDueAt: string | null;
  coachName: string | null;
  studentName: string;
  locale: "pt" | "en";
};

/**
 * Vista só de leitura da última ficha de anamnese e avaliação física (área do aluno).
 */
export function PhysicalAssessmentReadOnlyView({
  formData: d,
  clearance,
  assessedAt,
  nextDueAt,
  coachName,
  studentName,
  locale,
}: Props) {
  const L = locale === "pt";
  const objectives =
    Array.isArray(d.objectives) && d.objectives.length > 0
      ? d.objectives
          .map((v) => OBJECTIVE_OPTIONS.find((o) => o.value === v)?.label ?? v)
          .join(", ")
      : null;

  const medical =
    Array.isArray(d.medicalConditions) && d.medicalConditions.length > 0
      ? d.medicalConditions.map((c) => MEDICAL_CONDITIONS_LABELS[c] ?? c).join(", ")
      : null;

  const activityLabel = d.activityLevel
    ? ACTIVITY_LEVELS.find((a) => a.value === d.activityLevel)?.label ?? d.activityLevel
    : null;

  const mobility =
    Array.isArray(d.mobilityLimitations) && d.mobilityLimitations.length > 0
      ? d.mobilityLimitations.map((m) => MOBILITY_LABELS[m] ?? m).join(", ")
      : null;

  const postural =
    Array.isArray(d.posturalAssessment) && d.posturalAssessment.length > 0
      ? d.posturalAssessment.map((p) => POSTURAL_LABELS[p] ?? p).join(", ")
      : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10 px-4 pt-2">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] m-0">
          {L ? "Ficha de anamnese e avaliação física" : "Physical assessment & health form"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] m-0">
          {L ? "Apenas leitura. Para alterações, fala com a tua escola." : "Read only. Contact your school to update."}
        </p>
      </header>

      {section(
        L ? "Identificação e registo" : "Record",
        <>
          {line(L ? "Aluno" : "Student", studentName)}
          {line(L ? "Data da avaliação" : "Assessment date", assessedAt)}
          {nextDueAt ? line(L ? "Próxima renovação" : "Next renewal due", nextDueAt) : null}
          {coachName ? line(L ? "Registado por" : "Recorded by", coachName) : null}
          {line(L ? "Liberação" : "Clearance", clearanceLabel(clearance, locale))}
        </>,
        "meta"
      )}

      {section(
        L ? "2. Objetivo" : "2. Goals",
        <>
          {line(L ? "Objetivos" : "Objectives", objectives ?? "—")}
          {d.objectiveOther?.trim() ? line(L ? "Outro" : "Other", d.objectiveOther) : null}
        </>
      )}

      {section(
        L ? "3. Histórico de saúde" : "3. Health history",
        <>
          {line(L ? "Condições médicas" : "Medical conditions", medical ?? "—")}
          {d.medicalConditionsOther?.trim()
            ? line(L ? "Outras condições" : "Other conditions", d.medicalConditionsOther)
            : null}
          {line(L ? "Medicação regular" : "Regular medication", simNao(d.usesMedication, locale))}
          {d.medicationDetail?.trim() ? line(L ? "Detalhe" : "Detail", d.medicationDetail) : null}
          {line(L ? "Lesões relevantes" : "Relevant injuries", simNao(d.hasInjuries, locale))}
          {Array.isArray(d.injuries) && d.injuries.length > 0 ? (
            <ul className="list-disc pl-5 m-0 space-y-1">
              {d.injuries.map((inj, i) => (
                <li key={i} className="text-sm">
                  {[inj.region, inj.type, inj.year, inj.recovered != null ? (inj.recovered ? "✓" : "✗") : ""]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {section(
        L ? "4. PAR-Q" : "4. PAR-Q",
        <>
          {line(L ? "Dor no peito durante exercício" : "Chest pain during exercise", simNao(d.parqChestPain, locale))}
          {line(L ? "Desmaios / perda de equilíbrio" : "Fainting / balance loss", simNao(d.parqFainted, locale))}
          {line(L ? "Problema ósseo/articular agravado pelo exercício" : "Bone/joint problem worsened by exercise", simNao(d.parqBoneJoint, locale))}
          {line(L ? "Médico recomendou limitar atividade" : "Doctor advised limiting activity", simNao(d.parqDoctorLimit, locale))}
          {line(L ? "Outra condição que afete o treino" : "Other condition affecting training", simNao(d.parqOther, locale))}
        </>
      )}

      {section(
        L ? "5. Atividade física" : "5. Activity",
        <>
          {line(L ? "Nível habitual" : "Usual level", activityLabel ?? "—")}
          {line(L ? "Artes marciais prévias" : "Prior martial arts", simNao(d.previousMartialArts, locale))}
          {d.previousModality?.trim() ? line(L ? "Modalidade" : "Modality", d.previousModality) : null}
          {d.previousPracticeTime?.trim() ? line(L ? "Tempo de prática" : "Practice time", d.previousPracticeTime) : null}
        </>
      )}

      {section(
        L ? "6. Avaliação física" : "6. Physical evaluation",
        <>
          {d.heightCm != null || d.weightKg != null ? (
            <>
              <p className="text-xs font-semibold text-[var(--text-secondary)] m-0 mt-1">
                {L ? "Altura e peso (nesta avaliação)" : "Height & weight (this assessment)"}
              </p>
              {line(L ? "Altura (cm)" : "Height (cm)", d.heightCm ?? "—")}
              {line(L ? "Peso (kg)" : "Weight (kg)", d.weightKg ?? "—")}
            </>
          ) : null}
          <p className="text-xs font-semibold text-[var(--text-secondary)] m-0 mt-1">
            {L ? "6.1 Sinais vitais" : "6.1 Vitals"}
          </p>
          {line(L ? "FC repouso (bpm)" : "Resting HR (bpm)", d.heartRateRest ?? "—")}
          {line(L ? "Pressão arterial" : "Blood pressure", d.bloodPressure ?? "—")}
          {line(L ? "Saturação O₂" : "O₂ saturation", d.saturationO2 ?? "—")}
          <p className="text-xs font-semibold text-[var(--text-secondary)] m-0 mt-2">
            {L ? "6.2 Mobilidade" : "6.2 Mobility"}
          </p>
          {line(L ? "Itens" : "Items", mobility ?? "—")}
          {d.mobilityNotes?.trim() ? line(L ? "Notas" : "Notes", d.mobilityNotes) : null}
          <p className="text-xs font-semibold text-[var(--text-secondary)] m-0 mt-2">
            {L ? "6.3 Postura" : "6.3 Posture"}
          </p>
          {line(L ? "Itens" : "Items", postural ?? "—")}
          {d.posturalNotes?.trim() ? line(L ? "Notas" : "Notes", d.posturalNotes) : null}
          <p className="text-xs font-semibold text-[var(--text-secondary)] m-0 mt-2">
            {L ? "6.4 Medidas (cm)" : "6.4 Measures (cm)"}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] m-0 mt-1 mb-0">
            {L ? "Comprimentos" : "Lengths"}
          </p>
          {line(
            L ? "Largura dos ombros (biaquatorial)" : "Shoulder breadth (biacromial)",
            d.breadthShoulderCm ?? "—"
          )}
          {line(
            L ? "Braço ombro → ponta do dedo (esq. / dir.)" : "Arm shoulder → fingertip (L / R)",
            [d.lenArmShoulderFingertipLeftCm, d.lenArmShoulderFingertipRightCm].filter((x) => x != null).join(" / ") || "—"
          )}
          {line(
            L ? "Perna entrepé (esq. / dir.)" : "Leg inseam (L / R)",
            [d.lenLegInseamLeftCm, d.lenLegInseamRightCm].filter((x) => x != null).join(" / ") || "—"
          )}
          <p className="text-[11px] text-[var(--text-secondary)] m-0 mt-2 mb-0">
            {L ? "Circunferências" : "Circumferences"}
          </p>
          {line(L ? "Pescoço" : "Neck", d.circNeckCm ?? "—")}
          {line(L ? "Cabeça" : "Head", d.circHeadCm ?? "—")}
          {line(
            L ? "Braço relax. / meio braço (esq. / dir.)" : "Upper arm relaxed (L / R)",
            [d.circArmLeftCm, d.circArmRightCm].filter((x) => x != null).join(" / ") || "—"
          )}
          {line(
            L ? "Bíceps (esq. / dir.)" : "Biceps (L / R)",
            [d.circBicepsLeftCm, d.circBicepsRightCm].filter((x) => x != null).join(" / ") || "—"
          )}
          {line(
            L ? "Antebraço (esq. / dir.)" : "Forearm (L / R)",
            [d.circForearmLeftCm, d.circForearmRightCm].filter((x) => x != null).join(" / ") || "—"
          )}
          {line(L ? "Abdómen" : "Abdomen", d.circAbdomenCm ?? "—")}
          {line(L ? "Tórax" : "Chest", d.circChestCm ?? "—")}
          {line(L ? "Quadril" : "Hip", d.circHipCm ?? "—")}
          {line(L ? "Coxa esq. / dir." : "Thigh L / R", [d.circThighLeftCm, d.circThighRightCm].filter((x) => x != null).join(" / ") || "—")}
          {line(L ? "Panturrilha esq. / dir." : "Calf L / R", [d.circCalfLeftCm, d.circCalfRightCm].filter((x) => x != null).join(" / ") || "—")}
          {line(L ? "Calçado (ref.)" : "Shoe size", d.shoeSizeBr ?? "—")}
          {line(L ? "Comprimento do pé (cm)" : "Foot length (cm)", d.footLengthCm ?? "—")}
        </>
      )}

      {section(
        L ? "7. Testes físicos" : "7. Physical tests",
        <>
          {line(L ? "Flexões / 1 min" : "Push-ups / 1 min", d.pushups1min ?? "—")}
          {line(L ? "Abdominais / 1 min" : "Sit-ups / 1 min", d.situps1min ?? "—")}
          {line(L ? "Prancha (s)" : "Plank (s)", d.plankSeconds ?? "—")}
          {line(L ? "Agachamentos / 1 min" : "Squats / 1 min", d.squats1min ?? "—")}
          {line(L ? "Corrida / teste" : "Run / test", d.runTest ?? "—")}
        </>
      )}

      {section(
        L ? "8. Avaliação do instrutor (1–10)" : "8. Instructor scores (1–10)",
        <>
          {line(L ? "Condição física" : "Condition", d.scoreCondition ?? "—")}
          {line(L ? "Mobilidade" : "Mobility", d.scoreMobility ?? "—")}
          {line(L ? "Coordenação" : "Coordination", d.scoreCoordination ?? "—")}
          {line(L ? "Resistência" : "Endurance", d.scoreEndurance ?? "—")}
          {line(L ? "Força" : "Strength", d.scoreStrength ?? "—")}
          {d.instructorNotes?.trim() ? line(L ? "Notas do instrutor" : "Instructor notes", d.instructorNotes) : null}
        </>
      )}

      {section(
        L ? "9. Termo" : "9. Declaration",
        <>{line(L ? "Data de assinatura (aluno)" : "Student signature date", d.signatureDate ?? "—")}</>
      )}
    </div>
  );
}
