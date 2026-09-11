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
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";

type Props = {
  formRef: RefObject<HTMLFormElement | null>;
  studentDob: string | null;
};

/** Divide "Rótulo: resto da frase" no primeiro ":" perto do início; sem ":" cedo, a linha inteira é o rótulo. */
function splitHintLine(line: string): { header: string; rest: string } {
  const idx = line.indexOf(":");
  if (idx === -1 || idx > 60) return { header: line, rest: "" };
  return { header: line.slice(0, idx + 1), rest: line.slice(idx + 1).trim() };
}

/** Caixa que mostra só o rótulo e expande ao clicar para revelar a frase completa. */
function HintLineBox({ line }: { line: string }) {
  const [open, setOpen] = useState(false);
  const { header, rest } = splitHintLine(line);

  if (!rest) {
    return <li className="text-xs text-text-secondary list-none rounded-md border border-border/60 px-2.5 py-1.5">{header}</li>;
  }

  return (
    <li className="list-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left text-xs rounded-md border border-border/60 px-2.5 py-1.5 text-text-secondary hover:bg-bg/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <span className="font-medium text-text-primary">{header}</span>
        <span aria-hidden className="shrink-0 text-text-secondary">{open ? "▲" : "▼"}</span>
      </button>
      {open && <p className="text-xs text-text-secondary mt-1.5 mb-0 pl-2.5 leading-relaxed">{rest}</p>}
    </li>
  );
}

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
  const runPaceMinPerKm = readNumber(form, "runPaceMinPerKm");
  const ref = readRadio(form, "referenceSex");
  const referenceSex: ReferenceSex | null = ref === "F" || ref === "M" ? ref : null;

  return {
    heightCm: readNumber(form, "heightCm"),
    weightKg: readNumber(form, "weightKg"),
    pushups1min: pushups,
    situps1min: situps,
    runPaceMinPerKm: runPaceMinPerKm != null && runPaceMinPerKm > 0 ? runPaceMinPerKm : null,
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
      <p className="text-sm font-medium text-text-primary m-0 mb-2 inline-flex items-center gap-1.5">
        Sugestão automática (tabelas de referência)
        <InlineInfoTip
          ariaLabel="Como funciona a sugestão automática"
          detail={
            "Usa normas por idade e sexo para abdominais, flexões e IMC: dos 9 aos 18 anos, tabelas juvenis " +
            "(raparigas/rapazes); a partir dos 19 anos, abdominais 1 min. de Golding et al. (YMCA) e flexões do " +
            "ACSM (esta última até à exaustão, usada como aproximação ao teste de 1 min. desta ficha) e IMC " +
            "saudável da OMS (18,5–24,9). A resistência pode combinar abdominais com o ritmo de corrida (min/km) " +
            "(aproximação; não substitui VAIVÉM/milha, sem tabela validada para adultos). A velocidade pode ser " +
            "sugerida de forma aproximada a partir desse ritmo (não equivale aos tempos 20/40 m das tabelas). " +
            "A coordenação usa uma estimativa pela média de outras dimensões quando não há teste 4×10 m na ficha."
          }
        />
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
        <ul className="text-xs text-text-secondary space-y-1.5 m-0 p-0 max-w-4xl">
          {hint.pt.map((line, i) => (
            <HintLineBox key={i} line={line} />
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
