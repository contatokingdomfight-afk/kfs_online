"use client";

import { useMemo, useState } from "react";
import { IllustrativeBodyAvatar } from "@/components/IllustrativeBodyAvatar";
import { formDataProfileToAvatarScales } from "@/lib/illustrative-body-2d-pipeline";
import { hasIllustrativeAnthropometry } from "@/lib/illustrative-body-silhouette";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { SilhouetteMotorBPreview } from "./SilhouetteMotorBPreview";

const PRESET_MINIMAL = `{
  "circChestCm": 110,
  "circAbdomenCm": 95,
  "heightCm": 175,
  "weightKg": 78
}`;

const PRESET_RICH = `{
  "breadthShoulderCm": 44,
  "circChestCm": 102,
  "circAbdomenCm": 88,
  "circHipCm": 100,
  "circThighLeftCm": 58,
  "circThighRightCm": 58,
  "circCalfLeftCm": 38,
  "circCalfRightCm": 38,
  "circArmLeftCm": 30,
  "circArmRightCm": 30,
  "circBicepsLeftCm": 34,
  "circBicepsRightCm": 34,
  "lenLegInseamLeftCm": 80,
  "lenLegInseamRightCm": 80,
  "heightCm": 178,
  "weightKg": 82
}`;

export default function DevSilhouettePlayground() {
  const [raw, setRaw] = useState(PRESET_RICH);
  const parsed = useMemo((): Partial<PhysicalAssessmentFormData> | null => {
    try {
      const j = JSON.parse(raw) as unknown;
      if (typeof j === "object" && j !== null && !Array.isArray(j)) {
        return j as Partial<PhysicalAssessmentFormData>;
      }
    } catch {
      return null;
    }
    return null;
  }, [raw]);

  const pipeline = useMemo(() => {
    if (!parsed) return null;
    return formDataProfileToAvatarScales(parsed, null);
  }, [parsed]);

  const anthroOk = parsed ? hasIllustrativeAnthropometry(parsed) : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 text-text-primary">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ferramenta dev — silhueta 2D</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Só em ambientes não produtivos na Vercel. Compara motor A (<code>Avatar</code>) vs motor B (<code>buildSilhouetteParts</code>) e
          inspecciona <code>globalEnvelopeScale</code> (<code>computeGlobalBodyScale</code>).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary text-xs" onClick={() => setRaw(PRESET_MINIMAL)}>
          Preset mínimo
        </button>
        <button type="button" className="btn btn-secondary text-xs" onClick={() => setRaw(PRESET_RICH)}>
          Preset completo
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-text-secondary">JSON da ficha (parcial)</span>
        <textarea
          className="input min-h-[220px] w-full font-mono text-xs"
          spellCheck={false}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </label>

      {!parsed ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">JSON inválido.</p>
      ) : (
        <>
          <p className="text-xs text-text-secondary">
            <code>hasIllustrativeAnthropometry</code>: <strong>{anthroOk ? "sim" : "não"}</strong>
            {pipeline ? (
              <>
                {" · "}
                <code>globalEnvelopeScale</code>: <strong>{pipeline.globalEnvelopeScale.toFixed(3)}</strong>
              </>
            ) : null}
          </p>
          {pipeline ? (
            <pre className="overflow-x-auto rounded-lg border border-border bg-bg-secondary p-3 text-[11px] leading-relaxed text-text-secondary">
              {JSON.stringify(
                {
                  scales: pipeline.scales,
                  measurements: pipeline.measurements,
                  globalEnvelopeScale: pipeline.globalEnvelopeScale,
                },
                null,
                2
              )}
            </pre>
          ) : null}

          {anthroOk ? (
            <div className="grid gap-6 border border-border bg-bg-secondary/50 p-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-center text-xs font-medium text-text-secondary">Motor A — Avatar modular</p>
                <IllustrativeBodyAvatar
                  formData={parsed}
                  assessedAtLabel="dev"
                  showPoseTags
                  className="mx-auto max-w-[min(280px,92vw)]"
                  figureAriaLabel="Pré-visualização de desenvolvimento da silhueta ilustrativa"
                />
              </div>
              <div>
                <p className="mb-2 text-center text-xs font-medium text-text-secondary">Motor B — polígono compacto</p>
                <div className="flex justify-center pt-2">
                  <SilhouetteMotorBPreview fd={parsed} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Com menos de duas medidas antropométricas válidas, o motor A não mostra silhueta personalizada.</p>
          )}
        </>
      )}
    </div>
  );
}
