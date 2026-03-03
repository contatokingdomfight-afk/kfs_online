"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { updateStudent, setStudentFullAccess, promoteStudentToRole, type UpdateStudentResult, type SetFullAccessResult, type PromoteStudentResult } from "../actions";
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
  currentUserRole: string;
  initialLocale?: "pt" | "en";
};

export function EditarAlunoForm({ studentId, initialName, initialStatus, initialPlanId, initialPrimaryModality, planOptions, modalityOptions, statusLabels, currentUserRole, initialLocale = "pt" }: Props) {
  const t = getTranslations(initialLocale);
  const [userDismissed, setUserDismissed] = useState(false);
  const wrappedAction = async (prev: UpdateStudentResult | null, formData: FormData) => {
    setUserDismissed(false);
    return updateStudent(prev, formData);
  };
  const [state, formAction] = useFormState(wrappedAction, null as UpdateStudentResult | null);
  const [fullAccessState, fullAccessFormAction] = useFormState(setStudentFullAccess, null as SetFullAccessResult | null);
  const [promoteState, promoteFormAction] = useFormState(promoteStudentToRole, null as PromoteStudentResult | null);
  const router = useRouter();

  const showSuccess = Boolean(state?.success && !state?.error && !userDismissed);
  const canPromote = currentUserRole === "ALUNO";

  useEffect(() => {
    if (fullAccessState?.success) router.refresh();
  }, [fullAccessState?.success, router]);
  useEffect(() => {
    if (promoteState?.success) router.refresh();
  }, [promoteState?.success, router]);

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

      <div
        style={{
          padding: "clamp(12px, 3vw, 14px)",
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          borderLeft: "3px solid var(--primary)",
        }}
      >
        <p style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Acesso rápido
        </p>
        <form action={fullAccessFormAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: 14, padding: "8px 14px" }}
          >
            Atribuir acesso total (plataforma + ginásio)
          </button>
        </form>
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          Atribui um plano com plataforma digital e todas as modalidades. Requer um plano desse tipo na escola do aluno.
        </p>
        {fullAccessState?.success && (
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--success)" }}>Acesso total atribuído.</p>
        )}
        {fullAccessState?.error && (
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--danger)" }}>{fullAccessState.error}</p>
        )}
      </div>

      {canPromote && (
        <div
          style={{
            padding: "clamp(12px, 3vw, 14px)",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            borderLeft: "3px solid var(--text-secondary)",
          }}
        >
          <p style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Alterar perfil
          </p>
          <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Promover este utilizador (aluno) a Professor ou Administrador. Apenas disponível para perfis Aluno.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <form action={promoteFormAction} style={{ display: "inline" }}>
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="newRole" value="COACH" />
              <button type="submit" className="btn" style={{ fontSize: 14, padding: "8px 14px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                Promover a Professor
              </button>
            </form>
            <form action={promoteFormAction} style={{ display: "inline" }}>
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="newRole" value="ADMIN" />
              <button type="submit" className="btn" style={{ fontSize: 14, padding: "8px 14px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                Promover a Administrador
              </button>
            </form>
          </div>
          {promoteState?.success && (
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--success)" }}>Perfil alterado com sucesso.</p>
          )}
          {promoteState?.error && (
            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--danger)" }}>{promoteState.error}</p>
          )}
        </div>
      )}

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
