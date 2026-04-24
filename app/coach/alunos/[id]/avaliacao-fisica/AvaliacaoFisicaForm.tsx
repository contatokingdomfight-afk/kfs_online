"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { savePhysicalAssessment } from "./actions";
import { ConfirmModal } from "@/components/ConfirmModal";

type SubmitPhase = "idle" | "saving" | "saved";
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
  /** Destino após guardar com sucesso (perfil aluno, admin, etc.). */
  afterSaveHref: string;
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
  afterSaveHref,
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");

  useEffect(() => {
    if (state?.error) {
      setSubmitPhase("idle");
    }
    if (state?.success) {
      setSubmitPhase("saved");
    }
  }, [state]);

  useEffect(() => {
    if (submitPhase !== "saved") return;
    const t = window.setTimeout(() => {
      router.push(afterSaveHref);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [submitPhase, afterSaveHref, router]);

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmitClick = () => setShowConfirm(true);

  const handleConfirmSubmit = () => {
    setShowConfirm(false);
    setSubmitPhase("saving");
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-6 md:space-y-8 w-full">
      <input type="hidden" name="studentId" value={studentId} />
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Guardar avaliação física?"
        message="A ficha será registada e a próxima renovação ficará agendada para daqui a 6 meses. Deseja continuar?"
        confirmLabel="Sim, guardar"
        cancelLabel="Cancelar"
        variant="primary"
      />

      {(submitPhase === "saving" || submitPhase === "saved") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy={submitPhase === "saving"}
          aria-label={submitPhase === "saving" ? "A guardar avaliação física" : "Avaliação guardada, a redirecionar"}
        >
          <div className="rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border)] shadow-2xl max-w-md w-full p-6 text-center">
            {submitPhase === "saving" ? (
              <>
                <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  A guardar os dados…
                </p>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Aguarda enquanto a ficha de anamnese e avaliação física é registada no servidor.
                </p>
                <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full w-[40%] rounded-full bg-[var(--primary)] animate-loading-bar" />
                </div>
              </>
            ) : (
              <>
                <div
                  className="mx-auto w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center mb-4"
                  aria-hidden
                >
                  <span className="text-2xl text-green-600 dark:text-green-400">✓</span>
                </div>
                <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">Dados guardados</p>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  A ficha foi registada; a próxima renovação fica agendada para daqui a 6 meses. A redirecionar para a página
                  anterior…
                </p>
                <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden opacity-60">
                  <div className="h-full w-[40%] rounded-full bg-[var(--primary)] animate-loading-bar" />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 1. Identificação (só leitura) */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary px-2">1. Identificação do aluno</legend>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {studentName} · {studentEmail}
          {studentDob && ` · Nasc.: ${studentDob}`}
          {studentPhone && ` · ${studentPhone}`}
          {studentHeight != null && ` · ${studentHeight} cm`}
          {studentWeight != null && ` · ${studentWeight} kg`}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap sm:gap-x-6">
          <label className="flex flex-col gap-1 text-sm text-text-secondary min-w-0 sm:max-w-xs">
            <span className="font-medium text-text-primary">Data da avaliação</span>
            <input type="date" name="assessedAt" defaultValue={assessmentDate || today} className="input w-full sm:w-auto min-w-[10rem]" />
          </label>
        </div>
      </fieldset>

      {/* 2. Objetivo */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">2. Objetivo do aluno</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2.5 mt-3">
          {OBJECTIVE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-start gap-2.5 text-sm min-w-0">
              <input type="checkbox" name="objectives" value={o.value} className="rounded mt-0.5 shrink-0" />
              <span>{o.label}</span>
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-sm min-w-0 sm:col-span-2 xl:col-span-3">
            <span className="font-medium text-text-primary">Outro</span>
            <input type="text" name="objectiveOther" className="input w-full max-w-xl" placeholder="especificar" />
          </label>
        </div>
      </fieldset>

      {/* 3. Histórico de saúde */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">3. Histórico de saúde</legend>
        <p className="text-sm text-text-secondary mt-2 mb-2 font-medium">3.1 Condições médicas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
          {MEDICAL_CONDITIONS.map((c) => (
            <label key={c} className="flex items-start gap-2.5 text-sm min-w-0">
              <input type="checkbox" name="medicalConditions" value={c} className="rounded mt-0.5 shrink-0" />
              <span>{MEDICAL_CONDITIONS_LABELS[c] ?? c}</span>
            </label>
          ))}
        </div>
        <label className="mt-3 flex flex-col gap-1.5 text-sm max-w-xl">
          <span className="text-text-secondary">Outros (especificar)</span>
          <input type="text" name="medicalConditionsOther" className="input w-full" />
        </label>
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">3.2 Medicação regular?</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="usesMedication" value="false" defaultChecked /> Não
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="usesMedication" value="true" /> Sim
          </label>
        </div>
        <input type="text" name="medicationDetail" className="input mt-2 w-full max-w-xl" placeholder="Qual?" />
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">3.3 Lesões relevantes?</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="hasInjuries" value="false" defaultChecked /> Não
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="hasInjuries" value="true" /> Sim
          </label>
        </div>
      </fieldset>

      {/* 4. PAR-Q */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">4. Prontidão para exercício (PAR-Q)</legend>
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 mt-1 max-w-3xl">
          Se alguma resposta for SIM → encaminhar para avaliação médica.
        </p>
        <ul className="m-0 p-0 list-none space-y-2 max-w-3xl">
          {[
            { name: "parqChestPain", label: "Sente dor no peito durante exercício?" },
            { name: "parqFainted", label: "Já desmaiou ou perdeu equilíbrio?" },
            { name: "parqBoneJoint", label: "Tem problema ósseo/articular agravado pelo exercício?" },
            { name: "parqDoctorLimit", label: "Médico já recomendou limitar atividade física?" },
            { name: "parqOther", label: "Tem alguma outra condição que afete o treino?" },
          ].map(({ name, label }) => (
            <li key={name} className="rounded-lg border border-border bg-bg/40 px-3 py-2.5 md:px-4">
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input type="checkbox" name={name} value="true" className="rounded mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium text-text-primary">SIM</span>
                  <span className="text-text-secondary"> — {label}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {/* 5. Atividade */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">5. Nível de atividade física</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3">
          {ACTIVITY_LEVELS.map((a) => (
            <label key={a.value} className="flex items-start gap-2.5 text-sm min-w-0">
              <input type="radio" name="activityLevel" value={a.value} className="mt-0.5 shrink-0" />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
        <p className="text-sm font-medium text-text-primary mt-5 mb-2">Experiência prévia em artes marciais?</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="previousMartialArts" value="false" defaultChecked /> Não
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="previousMartialArts" value="true" /> Sim
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
          <input type="text" name="previousModality" className="input w-full" placeholder="Modalidade" />
          <input type="text" name="previousPracticeTime" className="input w-full" placeholder="Tempo de prática" />
        </div>
      </fieldset>

      {/* 6. Avaliação física */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">6. Avaliação física</legend>
        <p className="text-sm text-text-secondary mt-2 mb-2 font-medium">6.1 Sinais vitais (opcional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>FC repouso (bpm)</span>
            <input type="number" name="heartRateRest" min={30} max={200} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>PA</span>
            <input type="text" name="bloodPressure" className="input w-full max-w-[8rem]" placeholder="120/80" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Sat. O₂</span>
            <input type="text" name="saturationO2" className="input w-full max-w-[8rem]" />
          </label>
        </div>
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">6.2 Mobilidade</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {MOBILITY_OPTIONS.map((m) => (
            <label key={m} className="flex items-start gap-2.5 text-sm min-w-0">
              <input type="checkbox" name="mobilityLimitations" value={m} className="rounded mt-0.5 shrink-0" />
              <span>{MOBILITY_LABELS[m] ?? m}</span>
            </label>
          ))}
        </div>
        <input type="text" name="mobilityNotes" className="input mt-3 w-full max-w-3xl" placeholder="Observações" />
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">6.3 Postural</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {POSTURAL_OPTIONS.map((p) => (
            <label key={p} className="flex items-start gap-2.5 text-sm min-w-0">
              <input type="checkbox" name="posturalAssessment" value={p} className="rounded mt-0.5 shrink-0" />
              <span>{POSTURAL_LABELS[p] ?? p}</span>
            </label>
          ))}
        </div>
        <input type="text" name="posturalNotes" className="input mt-3 w-full max-w-3xl" placeholder="Observações" />
      </fieldset>

      {/* 6.4 Antropometria (opcional) */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">
          6.4 Comprimentos e circunferências (opcional)
        </legend>
        <p className="text-xs text-text-secondary mt-1 mb-4 max-w-4xl leading-relaxed">
          Valores em centímetros (inteiro). Esquerda/direita permitem assimetrias. Não substitui avaliação
          clínica; serve para acompanhamento desportivo e evolução (ex.: representação ilustrativa).
        </p>
        <p className="text-xs text-text-secondary font-medium mb-2">Comprimentos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3 mb-6">
          <label className="flex flex-col gap-1.5 text-sm min-w-0 sm:col-span-2 xl:col-span-2">
            <span>Largura dos ombros — biaquatorial (cm)</span>
            <input
              type="number"
              name="breadthShoulderCm"
              min={18}
              max={75}
              step={1}
              className="input w-full max-w-[7.5rem]"
            />
            <span className="text-[11px] text-text-secondary leading-snug">
              Distância entre os acrómios (pontas dos ombros), costas eretas; protocolo da escola (ex.: ISAK).
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço esq.: ombro → ponta do dedo (cm)</span>
            <input type="number" name="lenArmShoulderFingertipLeftCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço dir.: ombro → ponta do dedo (cm)</span>
            <input type="number" name="lenArmShoulderFingertipRightCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Perna esq.: entrepé (virilha → tornozelo int., cm)</span>
            <input type="number" name="lenLegInseamLeftCm" min={35} max={145} step={1} className="input w-full max-w-[7.5rem]" />
            <span className="text-[11px] text-text-secondary leading-snug">
              Complementa a altura no perfil; protocolo da escola (ex.: ISAK).
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Perna dir.: entrepé (virilha → tornozelo int., cm)</span>
            <input type="number" name="lenLegInseamRightCm" min={35} max={145} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
        </div>
        <p className="text-xs text-text-secondary font-medium mb-2">Circunferências</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-4">
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Pescoço (cm)</span>
            <input type="number" name="circNeckCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Cabeça (cm)</span>
            <input type="number" name="circHeadCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço relax. / meio braço — esq. (cm)</span>
            <input type="number" name="circArmLeftCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço relax. / meio braço — dir. (cm)</span>
            <input type="number" name="circArmRightCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Bíceps esq. (cm)</span>
            <input type="number" name="circBicepsLeftCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
            <span className="text-[11px] text-text-secondary leading-snug">ex.: braço flexionado</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Bíceps dir. (cm)</span>
            <input type="number" name="circBicepsRightCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
            <span className="text-[11px] text-text-secondary leading-snug">ex.: braço flexionado</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Antebraço esq. (cm)</span>
            <input type="number" name="circForearmLeftCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Antebraço dir. (cm)</span>
            <input type="number" name="circForearmRightCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Abdómen (cm)</span>
            <input type="number" name="circAbdomenCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Tórax (cm)</span>
            <input type="number" name="circChestCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
            <span className="text-[11px] text-text-secondary leading-snug">ex.: nível dos mamilos; seguir protocolo da escola</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Quadril (cm)</span>
            <input type="number" name="circHipCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Coxa esq. (cm)</span>
            <input type="number" name="circThighLeftCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Coxa dir. (cm)</span>
            <input type="number" name="circThighRightCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Panturrilha esq. (cm)</span>
            <input type="number" name="circCalfLeftCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Panturrilha dir. (cm)</span>
            <input type="number" name="circCalfRightCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>N.º calçado (BR ou nota)</span>
            <input type="text" name="shoeSizeBr" maxLength={16} className="input w-full max-w-[10rem]" placeholder="ex.: 40" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Comprimento do pé (cm)</span>
            <input type="number" name="footLengthCm" min={8} max={320} step={1} className="input w-full max-w-[7.5rem]" />
          </label>
        </div>
      </fieldset>

      {/* 7. Testes */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">7. Testes físicos básicos</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-3 max-w-4xl">
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Flexões / 1 min</span>
            <input type="number" name="pushups1min" min={0} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Abdominais / 1 min</span>
            <input type="number" name="situps1min" min={0} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Prancha (seg)</span>
            <input type="number" name="plankSeconds" min={0} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Agachamentos / 1 min</span>
            <input type="number" name="squats1min" min={0} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0 sm:col-span-2 lg:col-span-1">
            <span>Corrida (opcional)</span>
            <input type="text" name="runTest" className="input w-full max-w-md" />
          </label>
        </div>
      </fieldset>

      {/* 8. Avaliação instrutor */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">8. Avaliação do instrutor (1–10)</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3 mt-3 max-w-5xl">
          {["Condição física", "Mobilidade", "Coordenação", "Resistência", "Força"].map((label, i) => (
            <label key={label} className="flex flex-col gap-1.5 text-sm min-w-0">
              <span className="leading-snug">{label}</span>
              <input
                type="number"
                name={["scoreCondition", "scoreMobility", "scoreCoordination", "scoreEndurance", "scoreStrength"][i]}
                min={1}
                max={10}
                className="input w-full max-w-[4.5rem]"
              />
            </label>
          ))}
        </div>
        <textarea name="instructorNotes" rows={2} className="input mt-4 w-full max-w-3xl" placeholder="Observações do instrutor" />
      </fieldset>

      {/* 9. Termo */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">9. Termo de responsabilidade</legend>
        <p className="text-sm text-text-secondary max-w-3xl leading-relaxed">
          Declaro que as informações são verdadeiras e estou ciente dos riscos.
        </p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm max-w-xs">
          <span className="font-medium text-text-primary">Data assinatura (aluno)</span>
          <input type="date" name="signatureDate" className="input w-full min-w-[10rem]" />
        </label>
      </fieldset>

      {/* 10. Liberação */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">10. Liberação</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 max-w-4xl">
          {CLEARANCE_OPTIONS.map((c) => (
            <label
              key={c.value}
              className="flex items-start gap-2.5 text-sm rounded-lg border border-border px-3 py-3 cursor-pointer hover:bg-bg/30 min-h-[3.25rem]"
            >
              <input type="radio" name="clearance" value={c.value} required className="mt-0.5 shrink-0" />
              <span className="leading-snug">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={handleSubmitClick} className="btn btn-primary w-full sm:w-auto">
        Guardar avaliação física
      </button>
    </form>
  );
}
