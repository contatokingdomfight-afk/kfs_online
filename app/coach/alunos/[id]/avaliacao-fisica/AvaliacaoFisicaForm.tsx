"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { savePhysicalAssessment, type SaveAssessmentResult } from "./actions";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PhysicalAssessmentInstructorScoreHints } from "@/components/physical-assessment/PhysicalAssessmentInstructorScoreHints";
import { PhysicalAssessmentVitalSignsHints } from "@/components/physical-assessment/PhysicalAssessmentVitalSignsHints";
import type { VitalSignsSafety } from "@/lib/physical-assessment-vital-signs";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";

const AUTOSAVE_INTERVAL_MS = 60_000;

type SubmitPhase = "idle" | "saving" | "saved";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import { getRunPaceMinPerKm } from "@/lib/run-pace";
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
  /** Rascunho guardado anteriormente (se houver) — pré-preenche o formulário para retomar. */
  initialFormData?: PhysicalAssessmentFormData | null;
  initialClearance?: string | null;
};

/** No blur: ajusta `type=number` com min/max ao intervalo (evita erro nativo ao guardar). */
function clampNumberInputToMinMax(el: HTMLInputElement) {
  if (el.type !== "number") return;
  const raw = el.value.trim();
  if (raw === "") return;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return;
  let v = n;
  if (el.hasAttribute("min")) {
    const lo = Number(el.min);
    if (Number.isFinite(lo)) v = Math.max(v, lo);
  }
  if (el.hasAttribute("max")) {
    const hi = Number(el.max);
    if (Number.isFinite(hi)) v = Math.min(v, hi);
  }
  const rounded = Math.round(v);
  if (rounded !== n) el.value = String(rounded);
}

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
  initialFormData,
  initialClearance,
}: Props) {
  const fd = initialFormData ?? {};
  const [state, formAction] = useFormState(savePhysicalAssessment, null as SaveAssessmentResult | null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [lastIntent, setLastIntent] = useState<"draft" | "submit">("submit");
  /** Controla o hidden input "intent"; só disparamos requestSubmit() depois de React confirmar
   * (via effect, que corre após o commit) que o DOM já reflete o valor escolhido. */
  const [pendingIntent, setPendingIntent] = useState<"draft" | "submit" | null>(null);

  const sigPadRef = useRef<SignaturePadHandle>(null);
  const [signatureImageUrl, setSignatureImageUrl] = useState(fd.signatureImageUrl ?? "");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);

  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const dirtyRef = useRef(false);
  const [vitalSignsSafety, setVitalSignsSafety] = useState<VitalSignsSafety>({
    blockMaxEffortTests: false,
    bannerPt: null,
    restBpCategory: null,
  });
  const handleVitalSignsSafetyChange = useCallback((safety: VitalSignsSafety) => {
    setVitalSignsSafety(safety);
  }, []);

  /** Envia o desenho do canvas para o storage se houver traço novo; devolve o URL a usar (novo ou o já existente). */
  const uploadSignatureIfNeeded = useCallback(async (): Promise<string> => {
    const pad = sigPadRef.current;
    if (!pad || pad.isEmpty()) return signatureImageUrl;
    setSignatureUploading(true);
    setSignatureError(null);
    try {
      const blob = await pad.toBlob();
      if (!blob) {
        setSignatureError("Não foi possível capturar a assinatura. Tenta novamente.");
        return signatureImageUrl;
      }
      const body = new FormData();
      body.append("file", blob, "signature.png");
      body.append("studentId", studentId);
      const res = await fetch("/api/avaliacao-fisica/signature", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setSignatureError(json.error ?? "Falha ao guardar a assinatura.");
        return signatureImageUrl;
      }
      setSignatureImageUrl(json.url as string);
      return json.url as string;
    } catch {
      setSignatureError("Falha ao guardar a assinatura. Verifica a ligação e tenta novamente.");
      return signatureImageUrl;
    } finally {
      setSignatureUploading(false);
    }
  }, [signatureImageUrl, studentId]);

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
      if (lastIntent === "draft") {
        router.refresh();
        setSubmitPhase("idle");
      } else {
        router.push(afterSaveHref);
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [submitPhase, afterSaveHref, router, lastIntent]);

  useEffect(() => {
    if (!pendingIntent) return;
    formRef.current?.requestSubmit();
    setPendingIntent(null);
  }, [pendingIntent]);

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmitClick = () => setShowConfirm(true);

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach(clampNumberInputToMinMax);
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    await uploadSignatureIfNeeded();
    dirtyRef.current = false;
    setLastIntent("submit");
    setSubmitPhase("saving");
    setPendingIntent("submit");
  };

  const handleSaveDraftClick = async () => {
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach(clampNumberInputToMinMax);
    // Rascunho pode ficar incompleto — não valida campos obrigatórios (ex.: liberação ou assinatura).
    await uploadSignatureIfNeeded();
    dirtyRef.current = false;
    setLastIntent("draft");
    setSubmitPhase("saving");
    setPendingIntent("draft");
  };

  /** Guarda em segundo plano (sem modal nem redirect) — usada pelo autosave periódico. */
  const silentAutoSave = useCallback(async () => {
    const form = formRef.current;
    if (!form || !dirtyRef.current) return;
    setAutoSaveStatus("saving");
    try {
      const url = await uploadSignatureIfNeeded();
      const snapshot = new FormData(form);
      snapshot.set("intent", "draft");
      if (url) snapshot.set("signatureImageUrl", url);
      const result = await savePhysicalAssessment(null, snapshot);
      if (result.error) {
        setAutoSaveStatus("error");
      } else {
        dirtyRef.current = false;
        setAutoSaveStatus("saved");
        setLastAutoSavedAt(new Date());
      }
    } catch {
      setAutoSaveStatus("error");
    }
  }, [uploadSignatureIfNeeded]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (submitPhase === "idle") void silentAutoSave();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [submitPhase, silentAutoSave]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6 md:space-y-8 w-full"
      noValidate
      onInvalid={() => setSubmitPhase("idle")}
      onBlur={(e) => {
        if (e.target instanceof HTMLInputElement) clampNumberInputToMinMax(e.target);
      }}
      onChange={() => {
        dirtyRef.current = true;
      }}
    >
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="intent" value={pendingIntent ?? lastIntent} readOnly />
      <input type="hidden" name="signatureImageUrl" value={signatureImageUrl} readOnly />
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Entregar avaliação física?"
        message="A ficha será registada e a próxima renovação ficará agendada para daqui a 6 meses. Deseja continuar?"
        confirmLabel="Sim, entregar"
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
            ) : lastIntent === "draft" ? (
              <>
                <div
                  className="mx-auto w-12 h-12 rounded-full bg-amber-500/30 flex items-center justify-center mb-4"
                  aria-hidden
                >
                  <span className="text-2xl text-amber-600 dark:text-amber-400">✓</span>
                </div>
                <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">Rascunho guardado</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Podes continuar mais tarde — o que já preencheste fica guardado nesta ficha.
                </p>
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
              <input
                type="checkbox"
                name="objectives"
                value={o.value}
                defaultChecked={fd.objectives?.includes(o.value)}
                className="rounded mt-0.5 shrink-0"
              />
              <span>{o.label}</span>
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-sm min-w-0 sm:col-span-2 xl:col-span-3">
            <span className="font-medium text-text-primary">Outro</span>
            <input
              type="text"
              name="objectiveOther"
              defaultValue={fd.objectiveOther ?? ""}
              className="input w-full max-w-xl"
              placeholder="especificar"
            />
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
              <input
                type="checkbox"
                name="medicalConditions"
                value={c}
                defaultChecked={fd.medicalConditions?.includes(c)}
                className="rounded mt-0.5 shrink-0"
              />
              <span>{MEDICAL_CONDITIONS_LABELS[c] ?? c}</span>
            </label>
          ))}
        </div>
        <label className="mt-3 flex flex-col gap-1.5 text-sm max-w-xl">
          <span className="text-text-secondary">Outros (especificar)</span>
          <input type="text" name="medicalConditionsOther" defaultValue={fd.medicalConditionsOther ?? ""} className="input w-full" />
        </label>
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">3.2 Medicação regular?</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="usesMedication" value="false" defaultChecked={!fd.usesMedication} /> Não
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="usesMedication" value="true" defaultChecked={fd.usesMedication === true} /> Sim
          </label>
        </div>
        <input
          type="text"
          name="medicationDetail"
          defaultValue={fd.medicationDetail ?? ""}
          className="input mt-2 w-full max-w-xl"
          placeholder="Qual?"
        />
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">3.3 Lesões relevantes?</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="hasInjuries" value="false" defaultChecked={!fd.hasInjuries} /> Não
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="hasInjuries" value="true" defaultChecked={fd.hasInjuries === true} /> Sim
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
          {(
            [
              { name: "parqChestPain", label: "Sente dor no peito durante exercício?" },
              { name: "parqFainted", label: "Já desmaiou ou perdeu equilíbrio?" },
              { name: "parqBoneJoint", label: "Tem problema ósseo/articular agravado pelo exercício?" },
              { name: "parqDoctorLimit", label: "Médico já recomendou limitar atividade física?" },
              { name: "parqOther", label: "Tem alguma outra condição que afete o treino?" },
            ] as const
          ).map(({ name, label }) => (
            <li key={name} className="rounded-lg border border-border bg-bg/40 px-3 py-2.5 md:px-4">
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name={name}
                  value="true"
                  defaultChecked={fd[name] === true}
                  className="rounded mt-0.5 shrink-0"
                />
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
              <input
                type="radio"
                name="activityLevel"
                value={a.value}
                defaultChecked={fd.activityLevel === a.value}
                className="mt-0.5 shrink-0"
              />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
        <p className="text-sm font-medium text-text-primary mt-5 mb-2">Experiência prévia em artes marciais?</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="previousMartialArts" value="false" defaultChecked={!fd.previousMartialArts} /> Não
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="previousMartialArts" value="true" defaultChecked={fd.previousMartialArts === true} /> Sim
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
          <input type="text" name="previousModality" defaultValue={fd.previousModality ?? ""} className="input w-full" placeholder="Modalidade" />
          <input
            type="text"
            name="previousPracticeTime"
            defaultValue={fd.previousPracticeTime ?? ""}
            className="input w-full"
            placeholder="Tempo de prática"
          />
        </div>
      </fieldset>

      {/* 6. Avaliação física */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">6. Avaliação física</legend>
        <p className="text-sm text-text-secondary mt-2 mb-2 font-medium">Altura e peso (opcional)</p>
        <p className="text-xs text-text-secondary mb-3 max-w-3xl leading-relaxed">
          Sugestão a partir do perfil do aluno (Medidas corporais em «Perfil»). Podes corrigir aqui o valor
          medido ou registado nesta avaliação; o que guardares fica nesta ficha e é usado no mapa corporal
          ilustrativa quando existir.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mb-6">
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Altura (cm)</span>
            <input
              type="number"
              name="heightCm"
              min={100}
              max={250}
              step={1}
              defaultValue={fd.heightCm ?? studentHeight ?? ""}
              placeholder="ex.: 172"
              className="input w-full max-w-[10rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Peso (kg)</span>
            <input
              type="number"
              name="weightKg"
              min={20}
              max={300}
              step={0.1}
              defaultValue={fd.weightKg ?? studentWeight ?? ""}
              placeholder="ex.: 70,5"
              className="input w-full max-w-[10rem]"
            />
          </label>
        </div>
        <p className="text-sm text-text-secondary mt-2 mb-2 font-medium">6.1 Sinais vitais (opcional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span className="inline-flex items-center gap-1.5">
              FC repouso (bpm)
              <InlineInfoTip
                detail="Medida sentado, em repouso, após alguns minutos sem esforço."
                ariaLabel="Mais informação sobre FC em repouso"
              />
            </span>
            <input type="number" name="heartRateRest" min={30} max={200} defaultValue={fd.heartRateRest ?? ""} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span className="inline-flex items-center gap-1.5">
              FC em atividade (bpm)
              <InlineInfoTip
                detail="Ex.: após aquecimento ou após um teste leve; regista o contexto nas notas se precisares."
                ariaLabel="Mais informação sobre FC em atividade"
              />
            </span>
            <input
              type="number"
              name="heartRateActivity"
              min={40}
              max={220}
              defaultValue={fd.heartRateActivity ?? ""}
              className="input w-full max-w-[8rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span className="inline-flex items-center gap-1.5">
              PA repouso
              <InlineInfoTip
                detail="Pressão arterial em repouso (sentado), formato sistólica/diastólica — ex.: 120/80."
                ariaLabel="Mais informação sobre pressão arterial"
              />
            </span>
            <input type="text" name="bloodPressure" defaultValue={fd.bloodPressure ?? ""} className="input w-full max-w-[8rem]" placeholder="120/80" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span className="inline-flex items-center gap-1.5">
              PA em atividade
              <InlineInfoTip
                detail="Pressão arterial durante ou logo após esforço leve-moderado (ex.: 160/75). A PAS deve subir; a PAD tende a manter-se estável."
                ariaLabel="Mais informação sobre PA em atividade"
              />
            </span>
            <input
              type="text"
              name="bloodPressureActivity"
              defaultValue={fd.bloodPressureActivity ?? ""}
              className="input w-full max-w-[8rem]"
              placeholder="160/75"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span className="inline-flex items-center gap-1.5">
              Sat. O₂
              <InlineInfoTip
                detail="Saturação periférica em ar ambiente — ex.: 98 ou 98%."
                ariaLabel="Mais informação sobre saturação de oxigénio"
              />
            </span>
            <input type="text" name="saturationO2" defaultValue={fd.saturationO2 ?? ""} className="input w-full max-w-[8rem]" placeholder="98" />
          </label>
        </div>
        <PhysicalAssessmentVitalSignsHints
          formRef={formRef}
          studentDob={studentDob}
          onSafetyChange={handleVitalSignsSafetyChange}
        />
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">6.2 Mobilidade</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {MOBILITY_OPTIONS.map((m) => (
            <label key={m} className="flex items-start gap-2.5 text-sm min-w-0">
              <input
                type="checkbox"
                name="mobilityLimitations"
                value={m}
                defaultChecked={fd.mobilityLimitations?.includes(m)}
                className="rounded mt-0.5 shrink-0"
              />
              <span>{MOBILITY_LABELS[m] ?? m}</span>
            </label>
          ))}
        </div>
        <input
          type="text"
          name="mobilityNotes"
          defaultValue={fd.mobilityNotes ?? ""}
          className="input mt-3 w-full max-w-3xl"
          placeholder="Observações"
        />
        <p className="text-sm text-text-secondary mt-5 mb-2 font-medium">6.3 Postural</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {POSTURAL_OPTIONS.map((p) => (
            <label key={p} className="flex items-start gap-2.5 text-sm min-w-0">
              <input
                type="checkbox"
                name="posturalAssessment"
                value={p}
                defaultChecked={fd.posturalAssessment?.includes(p)}
                className="rounded mt-0.5 shrink-0"
              />
              <span>{POSTURAL_LABELS[p] ?? p}</span>
            </label>
          ))}
        </div>
        <input
          type="text"
          name="posturalNotes"
          defaultValue={fd.posturalNotes ?? ""}
          className="input mt-3 w-full max-w-3xl"
          placeholder="Observações"
        />
      </fieldset>

      {/* 6.4 Antropometria (opcional) */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary inline-flex items-center gap-1.5">
          6.4 Comprimentos e circunferências (opcional)
          <InlineInfoTip
            detail="Valores em centímetros (inteiro). Esquerda/direita permitem assimetrias. Não substitui avaliação clínica; serve para acompanhamento desportivo e evolução (ex.: representação ilustrativa)."
            ariaLabel="Mais informação sobre comprimentos e circunferências"
          />
        </legend>
        <p className="text-xs text-text-secondary font-medium mb-2 mt-3">Comprimentos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3 mb-6">
          <label className="flex flex-col gap-1.5 text-sm min-w-0 sm:col-span-2 xl:col-span-2">
            <span className="inline-flex items-center gap-1.5">
              Largura dos ombros — biaquatorial (cm)
              <InlineInfoTip
                detail="Distância entre os acrómios (pontas dos ombros), costas eretas; protocolo da escola (ex.: ISAK)."
                ariaLabel="Mais informação sobre largura dos ombros"
              />
            </span>
            <input
              type="number"
              name="breadthShoulderCm"
              min={18}
              max={75}
              step={1}
              defaultValue={fd.breadthShoulderCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço esq.: ombro → ponta do dedo (cm)</span>
            <input
              type="number"
              name="lenArmShoulderFingertipLeftCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.lenArmShoulderFingertipLeftCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço dir.: ombro → ponta do dedo (cm)</span>
            <input
              type="number"
              name="lenArmShoulderFingertipRightCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.lenArmShoulderFingertipRightCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Perna esq.: entrepé (virilha → tornozelo int., cm)</span>
            <input
              type="number"
              name="lenLegInseamLeftCm"
              min={35}
              max={145}
              step={1}
              defaultValue={fd.lenLegInseamLeftCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
            <span className="text-[11px] text-text-secondary leading-snug">
              Complementa a altura no perfil; protocolo da escola (ex.: ISAK).
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Perna dir.: entrepé (virilha → tornozelo int., cm)</span>
            <input
              type="number"
              name="lenLegInseamRightCm"
              min={35}
              max={145}
              step={1}
              defaultValue={fd.lenLegInseamRightCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
        </div>
        <p className="text-xs text-text-secondary font-medium mb-2">Circunferências</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-4">
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Pescoço (cm)</span>
            <input type="number" name="circNeckCm" min={8} max={320} step={1} defaultValue={fd.circNeckCm ?? ""} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Cabeça (cm)</span>
            <input type="number" name="circHeadCm" min={8} max={320} step={1} defaultValue={fd.circHeadCm ?? ""} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço relax. / meio braço — esq. (cm)</span>
            <input
              type="number"
              name="circArmLeftCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circArmLeftCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Braço relax. / meio braço — dir. (cm)</span>
            <input
              type="number"
              name="circArmRightCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circArmRightCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Bíceps esq. (cm)</span>
            <input
              type="number"
              name="circBicepsLeftCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circBicepsLeftCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
            <span className="text-[11px] text-text-secondary leading-snug">ex.: braço flexionado</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Bíceps dir. (cm)</span>
            <input
              type="number"
              name="circBicepsRightCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circBicepsRightCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
            <span className="text-[11px] text-text-secondary leading-snug">ex.: braço flexionado</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Antebraço esq. (cm)</span>
            <input
              type="number"
              name="circForearmLeftCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circForearmLeftCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Antebraço dir. (cm)</span>
            <input
              type="number"
              name="circForearmRightCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circForearmRightCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Abdómen (cm)</span>
            <input type="number" name="circAbdomenCm" min={8} max={320} step={1} defaultValue={fd.circAbdomenCm ?? ""} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Tórax (cm)</span>
            <input type="number" name="circChestCm" min={8} max={320} step={1} defaultValue={fd.circChestCm ?? ""} className="input w-full max-w-[7.5rem]" />
            <span className="text-[11px] text-text-secondary leading-snug">ex.: nível dos mamilos; seguir protocolo da escola</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Quadril (cm)</span>
            <input type="number" name="circHipCm" min={8} max={320} step={1} defaultValue={fd.circHipCm ?? ""} className="input w-full max-w-[7.5rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Coxa esq. (cm)</span>
            <input
              type="number"
              name="circThighLeftCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circThighLeftCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Coxa dir. (cm)</span>
            <input
              type="number"
              name="circThighRightCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circThighRightCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Panturrilha esq. (cm)</span>
            <input
              type="number"
              name="circCalfLeftCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circCalfLeftCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Panturrilha dir. (cm)</span>
            <input
              type="number"
              name="circCalfRightCm"
              min={8}
              max={320}
              step={1}
              defaultValue={fd.circCalfRightCm ?? ""}
              className="input w-full max-w-[7.5rem]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>N.º calçado (BR ou nota)</span>
            <input type="text" name="shoeSizeBr" maxLength={16} defaultValue={fd.shoeSizeBr ?? ""} className="input w-full max-w-[10rem]" placeholder="ex.: 40" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Comprimento do pé (cm)</span>
            <input type="number" name="footLengthCm" min={8} max={320} step={1} defaultValue={fd.footLengthCm ?? ""} className="input w-full max-w-[7.5rem]" />
          </label>
        </div>
      </fieldset>

      {/* 7. Testes */}
      <fieldset
        className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6"
        disabled={vitalSignsSafety.blockMaxEffortTests}
      >
        <legend className="text-base font-semibold text-text-primary">7. Testes físicos básicos</legend>
        {vitalSignsSafety.blockMaxEffortTests && (
          <p className="text-sm text-red-700 dark:text-red-300 mt-2 mb-0 max-w-3xl">
            Bloqueado: PA de repouso ou resposta ao esforço em zona crítica. Corrige os sinais vitais ou obtém liberação
            médica antes de registar testes de esforço.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-3 max-w-4xl">
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Flexões / 1 min</span>
            <input type="number" name="pushups1min" min={0} max={500} defaultValue={fd.pushups1min ?? ""} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Barras (pull-ups) / 1 min</span>
            <input type="number" name="pullUps1min" min={0} max={200} defaultValue={fd.pullUps1min ?? ""} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Abdominais / 1 min</span>
            <input type="number" name="situps1min" min={0} max={500} defaultValue={fd.situps1min ?? ""} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Prancha (seg)</span>
            <input type="number" name="plankSeconds" min={0} max={36000} defaultValue={fd.plankSeconds ?? ""} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Agachamentos / 1 min</span>
            <input type="number" name="squats1min" min={0} max={500} defaultValue={fd.squats1min ?? ""} className="input w-full max-w-[8rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0">
            <span>Minutos por quilómetro (corrida ou esteira)</span>
            <input
              type="number"
              name="runPaceMinPerKm"
              min={2}
              max={30}
              step="any"
              defaultValue={(() => {
                const pace = getRunPaceMinPerKm(fd);
                if (pace == null) return "";
                const rounded = Math.round(pace * 100) / 100;
                return rounded;
              })()}
              className="input w-full max-w-[9rem]"
              placeholder="ex.: 6,5"
            />
            <span className="text-[11px] text-text-secondary leading-snug">
              Tempo para completar 1 km (ex.: 6 min 30 s → 6,5).
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm min-w-0 sm:col-span-2 lg:col-span-3">
            <span>Corrida — observações (opcional)</span>
            <input type="text" name="runTest" defaultValue={fd.runTest ?? ""} className="input w-full max-w-md" />
          </label>
        </div>
      </fieldset>

      {/* 8. Avaliação instrutor */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">8. Avaliação do instrutor (1–10)</legend>
        <p className="text-xs text-text-secondary mt-1 mb-3 max-w-4xl leading-relaxed">
          Normas de referência por idade (juvenis 9–18; adultas a partir dos 19) e sexo: indica o sexo para calcular
          sugestões a partir de flexões, abdominais, IMC e (opcionalmente) ritmo de corrida (min/km). Podes ajustar todas as
          notas manualmente.
        </p>
        <div className="flex flex-wrap gap-4 mb-2">
          <span className="text-sm text-text-secondary shrink-0">Sexo para tabelas:</span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="referenceSex" value="" defaultChecked={!fd.referenceSex} className="rounded-full" />
            Não indicar
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="referenceSex" value="F" defaultChecked={fd.referenceSex === "F"} className="rounded-full" />
            Raparigas
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="referenceSex" value="M" defaultChecked={fd.referenceSex === "M"} className="rounded-full" />
            Rapazes
          </label>
        </div>
        <PhysicalAssessmentInstructorScoreHints formRef={formRef} studentDob={studentDob} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3 mt-3 max-w-6xl">
          {(
            [
              { label: "Condição física", name: "scoreCondition" },
              { label: "Mobilidade", name: "scoreMobility" },
              { label: "Coordenação", name: "scoreCoordination" },
              { label: "Resistência", name: "scoreEndurance" },
              { label: "Força", name: "scoreStrength" },
              { label: "Velocidade", name: "scoreSpeed" },
            ] as const
          ).map(({ label, name }) => (
            <label key={name} className="flex flex-col gap-1.5 text-sm min-w-0">
              <span className="leading-snug">{label}</span>
              <input type="number" name={name} min={1} max={10} defaultValue={fd[name] ?? ""} className="input w-full max-w-[4.5rem]" />
            </label>
          ))}
        </div>
        <textarea
          name="instructorNotes"
          rows={2}
          defaultValue={fd.instructorNotes ?? ""}
          className="input mt-4 w-full max-w-3xl"
          placeholder="Observações do instrutor"
        />
      </fieldset>

      {/* 9. Termo */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">9. Termo de responsabilidade</legend>
        <p className="text-sm text-text-secondary max-w-3xl leading-relaxed">
          Declaro que as informações são verdadeiras e estou ciente dos riscos.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-4 max-w-3xl">
          <label className="flex flex-col gap-1.5 text-sm max-w-xs">
            <span className="font-medium text-text-primary">Data assinatura (aluno)</span>
            <input type="date" name="signatureDate" defaultValue={fd.signatureDate ?? ""} className="input w-full min-w-[10rem]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-0">
            <span className="font-medium text-text-primary">Nome do aluno (assinatura)</span>
            <input type="text" name="signatureName" defaultValue={fd.signatureName ?? studentName} className="input w-full" />
          </label>
        </div>
        <div className="mt-4 max-w-md">
          {signatureImageUrl ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-primary">Assinatura registada</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureImageUrl}
                alt="Assinatura do aluno"
                className="max-w-[220px] rounded-md border border-border bg-white"
              />
              <span className="text-[11px] text-text-secondary">Para substituir, assina de novo abaixo.</span>
            </div>
          ) : null}
          <div className="mt-3">
            <SignaturePad ref={sigPadRef} label="Assinatura do aluno (desenha com o dedo ou o rato)" height={160} />
          </div>
          {signatureUploading && <p className="text-xs text-text-secondary mt-2 mb-0">A guardar assinatura…</p>}
          {signatureError && <p className="text-xs text-red-500 mt-2 mb-0">{signatureError}</p>}
        </div>
      </fieldset>

      {/* 10. Liberação */}
      <fieldset className="rounded-xl bg-bg-secondary border border-border p-4 md:p-6">
        <legend className="text-base font-semibold text-text-primary">10. Liberação</legend>
        <p className="text-xs text-text-secondary mt-1 mb-1 max-w-3xl">
          Obrigatória só para entregar a ficha — não é preciso para guardar como rascunho.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 max-w-4xl">
          {CLEARANCE_OPTIONS.map((c) => (
            <label
              key={c.value}
              className="flex items-start gap-2.5 text-sm rounded-lg border border-border px-3 py-3 cursor-pointer hover:bg-bg/30 min-h-[3.25rem]"
            >
              <input
                type="radio"
                name="clearance"
                value={c.value}
                required
                defaultChecked={initialClearance === c.value}
                className="mt-0.5 shrink-0"
              />
              <span className="leading-snug">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <button type="button" onClick={handleSaveDraftClick} className="btn btn-secondary w-full sm:w-auto">
          Guardar rascunho
        </button>
        <button type="button" onClick={handleSubmitClick} className="btn btn-primary w-full sm:w-auto">
          Entregar avaliação física
        </button>
        <span className="text-xs text-text-secondary">
          {autoSaveStatus === "saving"
            ? "A guardar automaticamente…"
            : autoSaveStatus === "saved" && lastAutoSavedAt
              ? `Guardado automaticamente às ${lastAutoSavedAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`
              : autoSaveStatus === "error"
                ? "Falha ao guardar automaticamente — usa «Guardar rascunho»."
                : ""}
        </span>
      </div>

      {/* Atalho flutuante para guardar rascunho — ocupa o lugar do assistente de chat do admin
          nesta página (ver AdminChatWidgetGate), para não competir com o preenchimento da ficha. */}
      <div className="admin-chat-fab-wrap">
        <button
          type="button"
          onClick={handleSaveDraftClick}
          className="btn btn-primary"
          style={{ width: 56, height: 56, borderRadius: "50%", padding: 0, fontSize: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }}
          aria-label="Guardar rascunho"
          title="Guardar rascunho"
        >
          💾
        </button>
      </div>
    </form>
  );
}
