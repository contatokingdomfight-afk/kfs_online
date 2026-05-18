"use client";

import type { RefObject } from "react";
import { useCallback, useState } from "react";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { MOBILITY_OPTIONS, POSTURAL_OPTIONS } from "@/lib/physical-assessment-types";
import {
  ageYearsAtAssessment,
  computePhysicalAssessmentReferenceScores,
  type ReferenceSex,
} from "@/lib/physical-assessment-reference-scores";

type Props = {
  formRef: RefObject<HTMLFormElement | null>;
  studentDob: string | null;
};

function readInput(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
    ? el.value.trim()
    : "";
}

function readNumber(form: HTMLFormElement, name: string): number | null {
  const raw = readInput(form, name);
  if (!raw) return null;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function readCheckedCheckboxes(form: HTMLFormElement, name: string): string[] {
  return Array.from(
    form.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]:checked`)
  ).map((i) => i.value);
}

function readRadio(form: HTMLFormElement, name: string): string {
  const el = form.querySelector<HTMLInputElement>(`input[type="radio"][name="${name}"]:checked`);
  return el?.value?.trim() ?? "";
}

function gatherPartialFormData(form: HTMLFormElement): Partial<PhysicalAssessmentFormData> {
  const pushups = readNumber(form, "pushups1min");
  const situps = readNumber(form, "situps1min");
  const runUnit = readInput(form, "runDistance1minUnit").toLowerCase() || "m";
  const runVal = readNumber(form, "runDistance1minValue");
  let runDistance1minMeters: number | null = null;
  if (runVal != null && runVal > 0) {
    runDistance1minMeters = runUnit === "km" ? Math.round(runVal * 1000) : Math.round(runVal);
  }
  const ref = readRadio(form, "referenceSex");
  const referenceSex: ReferenceSex | null = ref === "F" || ref === "M" ? ref : null;

  return {
    heightCm: readNumber(form, "heightCm"),
    weightKg: readNumber(form, "weightKg"),
    pushups1min: pushups,
    situps1min: situps,
    runDistance1minMeters,
    referenceSex,
    mobilityLimitations: readCheckedCheckboxes(form, "mobilityLimitations") as PhysicalAssessmentFormData["mobilityLimitations"],
    posturalAssessment: readCheckedCheckboxes(form, "posturalAssessment") as PhysicalAssessmentFormData["posturalAssessment"],
  };
}

export function PhysicalAssessmentInstructorScoreHints({ formRef, studentDob }: Props) {
  const [hint, setHint] = useState<{ pt: string[]; scores: Record<string, number | null> } | null>(null);

  const recalc = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const assessedAt = readInput(form, "assessedAt") || new Date().toISOString().slice(0, 10);
    const ageYears = ageYearsAtAssessment(studentDob, assessedAt);
    const partial = gatherPartialFormData(form);
    const sex = partial.referenceSex ?? null;
    const breakdown = computePhysicalAssessmentReferenceScores(partial, {
      ageYears,
      sex,
      heightCm: partial.heightCm ?? null,
      weightKg: partial.weightKg ?? null,
    });
    setHint({
      pt: breakdown.linesPt,
      scores: {
        scoreCondition: breakdown.scoreCondition,
        scoreMobility: breakdown.scoreMobility,
        scoreCoordination: breakdown.scoreCoordination,
        scoreEndurance: breakdown.scoreEndurance,
        scoreStrength: breakdown.scoreStrength,
        scoreSpeed: breakdown.scoreSpeed,
      },
    });
  }, [formRef, studentDob]);

  const apply = useCallback(() => {
    const form = formRef.current;
    if (!form || !hint) return;
    const map: [string, number | null][] = [
      ["scoreCondition", hint.scores.scoreCondition],
      ["scoreMobility", hint.scores.scoreMobility],
      ["scoreCoordination", hint.scores.scoreCoordination],
      ["scoreEndurance", hint.scores.scoreEndurance],
      ["scoreStrength", hint.scores.scoreStrength],
      ["scoreSpeed", hint.scores.scoreSpeed],
    ];
    for (const [name, v] of map) {
      if (v == null) continue;
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement) el.value = String(v);
    }
  }, [formRef, hint]);

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-4 mt-4 max-w-5xl">
      <p className="text-sm font-medium text-text-primary m-0 mb-2">Sugestão automática (tabelas de referência)</p>
      <p className="text-xs text-text-secondary m-0 mb-3 leading-relaxed">
        Usa as normas por idade (9–18 anos) que indicaste (raparigas/rapazes) para <strong>abdominais</strong>,{" "}
        <strong>flexões</strong> e <strong>IMC</strong>. A resistência pode combinar abdominais com a distância em 1 min
        (aproximação; não substitui VAIVÉM/milha). A <strong>velocidade</strong> pode ser sugerida de forma aproximada a
        partir dessa distância (não equivale aos tempos 20/40 m das tabelas). A <strong>coordenação</strong> usa uma
        estimativa pela média de outras dimensões quando não há teste 4×10 m na ficha.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-secondary text-sm" onClick={recalc}>
          Calcular sugestão
        </button>
        <button type="button" className="btn btn-primary text-sm" onClick={apply} disabled={!hint}>
          Copiar sugestão para as notas (1–10)
        </button>
      </div>
      {hint ? (
        <ul className="text-xs text-text-secondary space-y-1.5 m-0 pl-4 list-disc max-w-4xl">
          {hint.pt.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-secondary m-0">Marca o sexo para normas, preenche os testes e clica «Calcular sugestão».</p>
      )}
      <p className="text-[11px] text-text-secondary mt-3 m-0">
        Campos de mobilidade/postura usados:{" "}
        {MOBILITY_OPTIONS.join(", ")} · {POSTURAL_OPTIONS.join(", ")}.
      </p>
    </div>
  );
}
