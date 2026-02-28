"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { savePhysicalAssessment } from "./actions";
import {
  OBJECTIVE_OPTIONS,
  MEDICAL_CONDITIONS,
  MEDICAL_CONDITIONS_LABELS,
  ACTIVITY_LEVELS,
  MOBILITY_OPTIONS,
  MOBILITY_LABELS,
  POSTURAL_OPTIONS,
  POSTURAL_LABELS,
  CLEARANCE_OPTIONS,
} from "@/lib/physical-assessment-types";

type Props = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentDob: string | null;
  studentPhone: string | null;
  studentHeight: number | null;
  studentWeight: number | null;
  assessmentDate: string;
};

export function AvaliacaoFisicaForm({
  studentId,
  studentName,
  studentEmail,
  studentDob,
  studentPhone,
  studentHeight,
  studentWeight,
  assessmentDate,
}: Props) {
  const [state, formAction] = useFormState(savePhysicalAssessment, null as { error?: string; success?: boolean } | null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmitClick = () => {
    if (window.confirm("Confirma que pretende guardar a avaliação física? Esta ação registará a ficha e definirá a próxima renovação em 6 meses.")) {
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-8 max-w-2xl">
      <input type="hidden" name="studentId" value={studentId} />
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
        >
          <div className="rounded-2xl bg-bg-primary border border-border shadow-xl max-w-md w-full p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4" aria-hidden>
              <span className="text-2xl">✓</span>
            </div>
            <h2 id="success-modal-title" className="text-lg font-semibold text-text-primary mb-2">
              Avaliação guardada
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              A ficha foi registada. A próxima renovação está prevista para daqui a 6 meses.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/coach/alunos/${studentId}`)}
              className="btn btn-primary w-full"
            >
              Ir para o perfil do aluno
            </button>
          </div>
        </div>
      )}

      {/* 1. Identificação (só leitura) */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary px-2">1. Identificação do aluno</legend>
        <p className="text-sm text-text-secondary mt-2">
          {studentName} · {studentEmail}
          {studentDob && ` · Nasc.: ${studentDob}`}
          {studentPhone && ` · ${studentPhone}`}
          {studentHeight != null && ` · ${studentHeight} cm`}
          {studentWeight != null && ` · ${studentWeight} kg`}
        </p>
        <label className="block mt-3 text-sm text-text-secondary">
          Data da avaliação
          <input type="date" name="assessedAt" defaultValue={assessmentDate || today} className="input ml-2" />
        </label>
      </fieldset>

      {/* 2. Objetivo */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">2. Objetivo do aluno</legend>
        <div className="flex flex-wrap gap-3 mt-2">
          {OBJECTIVE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="objectives" value={o.value} className="rounded" />
              {o.label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            Outro: <input type="text" name="objectiveOther" className="input flex-1 min-w-[120px]" placeholder="especificar" />
          </label>
        </div>
      </fieldset>

      {/* 3. Histórico de saúde */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">3. Histórico de saúde</legend>
        <p className="text-sm text-text-secondary mt-1 mb-2">3.1 Condições médicas</p>
        <div className="flex flex-wrap gap-3">
          {MEDICAL_CONDITIONS.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="medicalConditions" value={c} className="rounded" />
              {MEDICAL_CONDITIONS_LABELS[c] ?? c}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">Outros: <input type="text" name="medicalConditionsOther" className="input w-40" /></label>
        </div>
        <p className="text-sm text-text-secondary mt-4 mb-2">3.2 Medicação regular?</p>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="usesMedication" value="false" defaultChecked /> Não</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="usesMedication" value="true" /> Sim</label>
        <input type="text" name="medicationDetail" className="input mt-2 w-full" placeholder="Qual?" />
        <p className="text-sm text-text-secondary mt-4 mb-2">3.3 Lesões relevantes?</p>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="hasInjuries" value="false" defaultChecked /> Não</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="hasInjuries" value="true" /> Sim</label>
      </fieldset>

      {/* 4. PAR-Q */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">4. Prontidão para exercício (PAR-Q)</legend>
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">Se alguma resposta for SIM → encaminhar para avaliação médica.</p>
        {[
          { name: "parqChestPain", label: "Sente dor no peito durante exercício?" },
          { name: "parqFainted", label: "Já desmaiou ou perdeu equilíbrio?" },
          { name: "parqBoneJoint", label: "Tem problema ósseo/articular agravado pelo exercício?" },
          { name: "parqDoctorLimit", label: "Médico já recomendou limitar atividade física?" },
          { name: "parqOther", label: "Tem alguma outra condição que afete o treino?" },
        ].map(({ name, label }) => (
          <label key={name} className="flex items-center gap-2 text-sm mt-2">
            <input type="checkbox" name={name} value="true" className="rounded" /> SIM — {label}
          </label>
        ))}
      </fieldset>

      {/* 5. Atividade */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">5. Nível de atividade física</legend>
        <div className="flex flex-wrap gap-3 mt-2">
          {ACTIVITY_LEVELS.map((a) => (
            <label key={a.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="activityLevel" value={a.value} /> {a.label}
            </label>
          ))}
        </div>
        <p className="text-sm mt-3">Experiência prévia em artes marciais?</p>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="previousMartialArts" value="false" defaultChecked /> Não</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="previousMartialArts" value="true" /> Sim</label>
        <input type="text" name="previousModality" className="input mt-2 w-full" placeholder="Modalidade" />
        <input type="text" name="previousPracticeTime" className="input mt-2 w-full" placeholder="Tempo de prática" />
      </fieldset>

      {/* 6. Avaliação física */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">6. Avaliação física</legend>
        <p className="text-sm text-text-secondary mt-1 mb-2">6.1 Sinais vitais (opcional)</p>
        <div className="flex flex-wrap gap-4">
          <label className="text-sm">FC repouso (bpm): <input type="number" name="heartRateRest" min={30} max={200} className="input w-20" /></label>
          <label className="text-sm">PA: <input type="text" name="bloodPressure" className="input w-24" placeholder="120/80" /></label>
          <label className="text-sm">Sat. O2: <input type="text" name="saturationO2" className="input w-20" /></label>
        </div>
        <p className="text-sm text-text-secondary mt-4 mb-2">6.2 Mobilidade</p>
        <div className="flex flex-wrap gap-3">
          {MOBILITY_OPTIONS.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="mobilityLimitations" value={m} className="rounded" />
              {MOBILITY_LABELS[m] ?? m}
            </label>
          ))}
        </div>
        <input type="text" name="mobilityNotes" className="input mt-2 w-full" placeholder="Observações" />
        <p className="text-sm text-text-secondary mt-4 mb-2">6.3 Postural</p>
        <div className="flex flex-wrap gap-3">
          {POSTURAL_OPTIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="posturalAssessment" value={p} className="rounded" />
              {POSTURAL_LABELS[p] ?? p}
            </label>
          ))}
        </div>
        <input type="text" name="posturalNotes" className="input mt-2 w-full" placeholder="Observações" />
      </fieldset>

      {/* 7. Testes */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">7. Testes físicos básicos</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <label className="text-sm">Flexões 1 min: <input type="number" name="pushups1min" min={0} className="input w-20" /></label>
          <label className="text-sm">Abdominais 1 min: <input type="number" name="situps1min" min={0} className="input w-20" /></label>
          <label className="text-sm">Prancha (seg): <input type="number" name="plankSeconds" min={0} className="input w-20" /></label>
          <label className="text-sm">Agachamentos 1 min: <input type="number" name="squats1min" min={0} className="input w-20" /></label>
          <label className="text-sm">Corrida (opcional): <input type="text" name="runTest" className="input w-32" /></label>
        </div>
      </fieldset>

      {/* 8. Avaliação instrutor */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">8. Avaliação do instrutor (1–10)</legend>
        <div className="flex flex-wrap gap-4 mt-2">
          {["Condição física", "Mobilidade", "Coordenação", "Resistência", "Força"].map((label, i) => (
            <label key={label} className="text-sm">
              {label}: <input type="number" name={["scoreCondition", "scoreMobility", "scoreCoordination", "scoreEndurance", "scoreStrength"][i]} min={1} max={10} className="input w-14" />
            </label>
          ))}
        </div>
        <textarea name="instructorNotes" rows={2} className="input mt-3 w-full" placeholder="Observações do instrutor" />
      </fieldset>

      {/* 9. Termo */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">9. Termo de responsabilidade</legend>
        <p className="text-sm text-text-secondary">Declaro que as informações são verdadeiras e estou ciente dos riscos.</p>
        <label className="block mt-2 text-sm">Data assinatura aluno: <input type="date" name="signatureDate" className="input ml-2" /></label>
      </fieldset>

      {/* 10. Liberação */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4">
        <legend className="text-base font-semibold text-text-primary">10. Liberação</legend>
        <div className="flex flex-wrap gap-4 mt-2">
          {CLEARANCE_OPTIONS.map((c) => (
            <label key={c.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="clearance" value={c.value} required /> {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={handleSubmitClick} className="btn btn-primary">
        Guardar avaliação física
      </button>
    </form>
  );
}
