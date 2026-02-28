"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { updateStudent, type UpdateStudentResult } from "../actions";
import { getTranslations } from "@/lib/i18n";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModal";

type PlanOption = { id: string; label: string };
type ModalityOption = { code: string; name: string };

type Props = {
  studentId: string;
  initialName: string;
  initialStatus: string;
  initialPlanId: string;
  initialPrimaryModality: string;
  planOptions: PlanOption[];
  modalityOptions: ModalityOption[];
  statusLabels: Record<string, string>;
  initialLocale?: "pt" | "en";
};

export function EditarAlunoForm({ studentId, initialName, initialStatus, initialPlanId, initialPrimaryModality, planOptions, modalityOptions, statusLabels, initialLocale = "pt" }: Props) {
  const t = getTranslations(initialLocale);
  const [userDismissed, setUserDismissed] = useState(false);
  const wrappedAction = async (prev: UpdateStudentResult | null, formData: FormData) => {
    setUserDismissed(false);
    return updateStudent(prev, formData);
  };
  const [state, formAction] = useFormState(wrappedAction, null as UpdateStudentResult | null);

  const showSuccess = Boolean(state?.success && !state?.error && !userDismissed);

  return (
    <>
      <SuccessConfirmModal
        open={showSuccess}
        onClose={() => setUserDismissed(true)}
        title={t("savedSuccessTitle")}
        message={t("savedSuccessMessage")}
        closeLabel={t("closeConfirm")}
      />
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
      }}
    >
      <input type="hidden" name="studentId" value={studentId} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome
        </span>
        <input
          type="text"
          name="name"
          defaultValue={initialName}
          className="input"
          placeholder="Nome completo"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Status
        </span>
        <select name="status" className="input" defaultValue={initialStatus}>
          {(["ATIVO", "INATIVO", "EXPERIMENTAL"] as const).map((s) => (
            <option key={s} value={s}>
              {statusLabels[s] ?? s}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Plano
        </span>
        <select name="planId" className="input" defaultValue={initialPlanId || ""}>
          <option value="">Sem plano atribuído</option>
          {planOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Modalidade principal
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
          Para planos &quot;Uma modalidade&quot;: define qual aula o aluno vê na agenda.
        </span>
        <select name="primaryModality" className="input" defaultValue={initialPrimaryModality || ""}>
          <option value="">Nenhuma (ou plano inclui todas)</option>
          {modalityOptions.map((m) => (
            <option key={m.code} value={m.code}>{m.name}</option>
          ))}
        </select>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        {t("saveButton")}
      </button>
    </form>
    </>
  );
}
