"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";
import { ageYearsAtAssessment } from "@/lib/physical-assessment-reference-scores";
import {
  evaluateVitalSigns,
  type VitalSignEvaluation,
  type VitalSignSeverity,
  type VitalSignsEvaluationResult,
  type VitalSignsSafety,
} from "@/lib/physical-assessment-vital-signs";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";

type Props = {
  formRef: RefObject<HTMLFormElement | null>;
  studentDob: string | null;
  onSafetyChange?: (safety: VitalSignsSafety) => void;
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

function readRadio(form: HTMLFormElement, name: string): string {
  const el = form.querySelector<HTMLInputElement>(`input[type="radio"][name="${name}"]:checked`);
  return el?.value?.trim() ?? "";
}

function severityClass(severity: VitalSignSeverity): string {
  if (severity === "ok") return "text-emerald-700 dark:text-emerald-400";
  if (severity === "caution") return "text-amber-700 dark:text-amber-400";
  if (severity === "warning") return "text-orange-700 dark:text-orange-400";
  return "text-red-700 dark:text-red-400";
}

function severityBadge(severity: VitalSignSeverity): string {
  if (severity === "ok") return "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300";
  if (severity === "caution") return "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200";
  if (severity === "warning") return "bg-orange-500/15 border-orange-500/40 text-orange-900 dark:text-orange-200";
  return "bg-red-500/15 border-red-500/40 text-red-900 dark:text-red-200";
}

function EvalLine({ title, evaluation }: { title: string; evaluation: VitalSignEvaluation | null }) {
  if (!evaluation) return null;
  return (
    <li className={`text-xs list-none rounded-md border px-2.5 py-1.5 ${severityBadge(evaluation.severity)}`}>
      <span className="font-medium">{title}: </span>
      <span className={severityClass(evaluation.severity)}>{evaluation.labelPt}</span>
      <span className="block mt-0.5 leading-relaxed opacity-90">{evaluation.detailPt}</span>
    </li>
  );
}

export function PhysicalAssessmentVitalSignsHints({ formRef, studentDob, onSafetyChange }: Props) {
  const [result, setResult] = useState<VitalSignsEvaluationResult | null>(null);

  const recalc = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const assessedAt = readInput(form, "assessedAt") || new Date().toISOString().slice(0, 10);
    const ageYears = ageYearsAtAssessment(studentDob, assessedAt);
    const refSex = readRadio(form, "referenceSex");
    const referenceSex = refSex === "F" || refSex === "M" ? refSex : null;

    const next = evaluateVitalSigns(
      {
        heartRateRest: readNumber(form, "heartRateRest"),
        heartRateActivity: readNumber(form, "heartRateActivity"),
        bloodPressure: readInput(form, "bloodPressure") || null,
        bloodPressureActivity: readInput(form, "bloodPressureActivity") || null,
        saturationO2: readInput(form, "saturationO2") || null,
        referenceSex,
      },
      ageYears
    );
    setResult(next);
    onSafetyChange?.(next.safety);
  }, [formRef, studentDob, onSafetyChange]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    recalc();
    const handler = () => recalc();
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
    return () => {
      form.removeEventListener("input", handler);
      form.removeEventListener("change", handler);
    };
  }, [formRef, recalc]);

  if (!result) return null;

  const ref = result.reference;
  const hasEval =
    result.restingHr != null ||
    result.activityHr != null ||
    result.restingBp != null ||
    result.activityBp != null ||
    result.spo2 != null;

  return (
    <div className="rounded-lg border border-border bg-bg/40 p-4 mt-4 max-w-5xl">
      {result.safety.blockMaxEffortTests && result.safety.bannerPt && (
        <div
          className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2.5 mb-3 text-sm text-red-900 dark:text-red-200"
          role="alert"
        >
          <strong>Trava de segurança:</strong> {result.safety.bannerPt} Os testes físicos de esforço ficam bloqueados até
          reavaliação médica.
        </div>
      )}

      <p className="text-sm font-medium text-text-primary m-0 mb-2 inline-flex items-center gap-1.5">
        Referência de sinais vitais
        {ref.ageYears != null ? ` (${ref.ageLabelPt})` : ""}
        <InlineInfoTip
          ariaLabel="Sobre as referências de sinais vitais"
          detail={
            "Triagem escolar — não substitui avaliação médica. PA repouso (adultos): critérios SBC/AHA " +
            "(normal <120/<80; pré-hipertensão; HT estágio 1; HT estágio 2+ ≥160/100 bloqueia esforço máximo). " +
            "PA em atividade: PAS deve subir; alerta se PAS >220 mmHg (ou >210 em mulheres/≥60 anos), PAD >105–110, " +
            "ou queda da PAS vs repouso. Duplo produto = FC × PAS (trabalho miocárdico)."
          }
        />
      </p>

      <ul className="text-xs text-text-secondary space-y-1.5 m-0 p-0 mb-3">
        <li className="list-none">
          <strong className="text-text-primary">FC repouso:</strong> {ref.restingHr.okMin}–{ref.restingHr.okMax} bpm
        </li>
        <li className="list-none">
          <strong className="text-text-primary">FC em atividade (leve-moderada):</strong>{" "}
          {ref.activityHr.okMin}–{ref.activityHr.okMax} bpm
        </li>
        <li className="list-none">
          <strong className="text-text-primary">PA repouso:</strong> {ref.bloodPressureRestNotePt}
        </li>
        <li className="list-none">
          <strong className="text-text-primary">PA em atividade:</strong> PAS sobe; alerta &gt;220 (ou &gt;210 mulheres/≥60
          anos), PAD &gt;105–110, ou queda da PAS vs repouso.
        </li>
        <li className="list-none">
          <strong className="text-text-primary">Sat. O₂:</strong> ≥{ref.spo2.okMin}%
        </li>
      </ul>

      {ref.ageYears == null && (
        <p className="text-xs text-amber-700 dark:text-amber-400 m-0 mb-2">
          Data de nascimento não indicada — usa critérios de adulto para PA. Completa o perfil para faixas por idade.
        </p>
      )}

      {hasEval ? (
        <ul className="space-y-1.5 m-0 p-0">
          <EvalLine title="FC repouso" evaluation={result.restingHr} />
          <EvalLine title="FC em atividade" evaluation={result.activityHr} />
          <EvalLine title="PA repouso" evaluation={result.restingBp?.evaluation ?? null} />
          <EvalLine title="PA em atividade" evaluation={result.activityBp} />
          <EvalLine title="Sat. O₂" evaluation={result.spo2} />
          {result.doubleProductRest && (
            <li className="text-xs text-text-secondary list-none rounded-md border border-border/60 px-2.5 py-1.5">
              <span className="font-medium text-text-primary">{result.doubleProductRest.labelPt}: </span>
              {result.doubleProductRest.value}{" "}
              <span className="opacity-80">
                ({result.doubleProductRest.hr} × {result.doubleProductRest.systolic})
              </span>
            </li>
          )}
          {result.doubleProductActivity && (
            <li className="text-xs text-text-secondary list-none rounded-md border border-border/60 px-2.5 py-1.5">
              <span className="font-medium text-text-primary">{result.doubleProductActivity.labelPt}: </span>
              {result.doubleProductActivity.value}{" "}
              <span className="opacity-80">
                ({result.doubleProductActivity.hr} × {result.doubleProductActivity.systolic})
              </span>
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs text-text-secondary m-0">Preenche os campos acima para ver a classificação automática.</p>
      )}
    </div>
  );
}
