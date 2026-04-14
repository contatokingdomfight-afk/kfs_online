"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateStudent,
  setStudentFullAccess,
  clearStudentPlanAccess,
  promoteStudentToRole,
  type UpdateStudentResult,
  type SetFullAccessResult,
  type ClearStudentPlanResult,
  type PromoteStudentResult,
} from "../actions";
import { getTranslations } from "@/lib/i18n";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import { FormLoadingModal } from "@/components/FormLoadingModal";

type PlanOption = { id: string; label: string };
type ModalityOption = { code: string; name: string };
type SchoolOption = { id: string; name: string };

function SubmitGuardarButton({ saveLabel }: { saveLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "A guardar…" : saveLabel}
    </button>
  );
}

function FullAccessFormInner({ studentId }: { studentId: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <FormLoadingModal message="A atribuir acesso à plataforma…" />
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        className="btn btn-primary"
        style={{ fontSize: 14, padding: "8px 14px" }}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "A atribuir acesso…" : "Atribuir acesso total (plataforma + ginásio)"}
      </button>
    </>
  );
}

function ClearPlanFormInner({ studentId, disabled }: { studentId: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <>
      <FormLoadingModal message="A remover o plano…" />
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        className="btn"
        style={{
          fontSize: 14,
          padding: "8px 14px",
          border: "1px solid var(--danger)",
          color: "var(--danger)",
          backgroundColor: "transparent",
        }}
        disabled={pending || disabled}
        aria-busy={pending}
      >
        {pending ? "A remover…" : "Remover plano e acesso via subscrição"}
      </button>
    </>
  );
}

/** Fora do `<details>` «Editar dados» para acesso rápido e promover ficarem sempre visíveis no admin. */
export function AdminAlunoQuickActions({
  studentId,
  initialPlanId,
  initialAdminGrantedFullAccess = false,
  editedUserRole,
}: {
  studentId: string;
  initialPlanId: string;
  initialAdminGrantedFullAccess?: boolean;
  /** Papel na BD do utilizador deste registo de aluno (não o admin logado). */
  editedUserRole: string | null | undefined;
}) {
  const [fullAccessState, fullAccessFormAction] = useFormState(setStudentFullAccess, null as SetFullAccessResult | null);
  const [clearPlanState, clearPlanFormAction] = useFormState(clearStudentPlanAccess, null as ClearStudentPlanResult | null);
  const [promoteState, promoteFormAction] = useFormState(promoteStudentToRole, null as PromoteStudentResult | null);
  const router = useRouter();

  // Se `role` não vier na resposta (caso raro), alinhar ao comportamento antigo: tratar como ALUNO.
  const roleNorm = String(editedUserRole ?? "ALUNO")
    .trim()
    .toUpperCase();
  const canPromote = roleNorm === "ALUNO";
  const hasAssignedPlan = Boolean(initialPlanId);

  useEffect(() => {
    if (fullAccessState?.success) router.refresh();
  }, [fullAccessState?.success, router]);
  useEffect(() => {
    if (clearPlanState?.success) router.refresh();
  }, [clearPlanState?.success, router]);
  useEffect(() => {
    if (promoteState?.success) router.refresh();
  }, [promoteState?.success, router]);

  return (
    <div
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
        marginTop: "clamp(24px, 6vw, 32px)",
        marginBottom: "clamp(16px, 4vw, 20px)",
      }}
    >
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {!initialAdminGrantedFullAccess && (
            <form action={fullAccessFormAction}>
              <FullAccessFormInner studentId={studentId} />
            </form>
          )}
          <form
            action={clearPlanFormAction}
            onSubmit={(e) => {
              if (
                !hasAssignedPlan ||
                !window.confirm(
                  "Remover o plano deste aluno? Fica sem acesso à plataforma conforme plano. Se existir subscrição Stripe ativa, será cancelada."
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <ClearPlanFormInner studentId={studentId} disabled={!hasAssignedPlan} />
          </form>
        </div>
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          {initialAdminGrantedFullAccess ? (
            <>Acesso total atribuído pelo atalho. Usa «Remover plano» para revogar (inclui este acesso).</>
          ) : (
            <>
              Atribui um plano com plataforma digital e todas as modalidades (usa o plano FULL da escola do aluno, ou qualquer plano equivalente no catálogo).
              Usa «Remover plano» para revogar o plano atual (inclui acesso total atribuído aqui ou noutro plano).
            </>
          )}
        </p>
        {fullAccessState?.success && (
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--success)" }}>Acesso total atribuído.</p>
        )}
        {fullAccessState?.error && (
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--danger)" }}>{fullAccessState.error}</p>
        )}
        {clearPlanState?.success && (
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--success)" }}>
            Plano removido. O aluno ficou sem plano atribuído.
          </p>
        )}
        {clearPlanState?.error && (
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--danger)" }}>{clearPlanState.error}</p>
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
              <button
                type="submit"
                className="btn"
                style={{ fontSize: 14, padding: "8px 14px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
              >
                Promover a Professor
              </button>
            </form>
            <form action={promoteFormAction} style={{ display: "inline" }}>
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="newRole" value="ADMIN" />
              <button
                type="submit"
                className="btn"
                style={{ fontSize: 14, padding: "8px 14px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
              >
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
    </div>
  );
}

type Props = {
  studentId: string;
  initialName: string;
  initialStatus: string;
  initialSchoolId: string;
  schoolOptions: SchoolOption[];
  initialPlanId: string;
  initialPrimaryModality: string;
  planOptions: PlanOption[];
  modalityOptions: ModalityOption[];
  statusLabels: Record<string, string>;
  initialLocale?: "pt" | "en";
};

export function EditarAlunoForm({
  studentId,
  initialName,
  initialStatus,
  initialSchoolId,
  schoolOptions,
  initialPlanId,
  initialPrimaryModality,
  planOptions,
  modalityOptions,
  statusLabels,
  initialLocale = "pt",
}: Props) {
  const t = getTranslations(initialLocale);
  const [userDismissed, setUserDismissed] = useState(false);
  const wrappedAction = async (prev: UpdateStudentResult | null, formData: FormData) => {
    setUserDismissed(false);
    return updateStudent(prev, formData);
  };
  const [state, formAction] = useFormState(wrappedAction, null as UpdateStudentResult | null);
  const router = useRouter();

  const showSuccess = Boolean(state?.success && !state?.error && !userDismissed);

  useEffect(() => {
    if (state?.success && !state?.error) router.refresh();
  }, [state?.success, state?.error, router]);

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
        <FormLoadingModal message="A guardar…" />
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
          Escola *
        </span>
        <select name="schoolId" className="input" defaultValue={initialSchoolId || ""} required>
          <option value="">Selecione uma escola</option>
          {schoolOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
          Planos ativos do catálogo (a escola indicada é a do registo do plano na admin; o aluno mantém a escola do campo «Escola» acima).
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
          {modalityOptions.map((m) => (
            <option key={m.code || "all"} value={m.code}>{m.name}</option>
          ))}
        </select>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <SubmitGuardarButton saveLabel={t("saveButton")} />
    </form>
    </>
  );
}
