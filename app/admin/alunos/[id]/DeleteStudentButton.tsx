"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { deleteStudent } from "../actions";

export function DeleteStudentButton({
  studentId,
  studentName,
  studentEmail,
}: {
  studentId: string;
  studentName: string;
  studentEmail: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [state, formAction] = useFormState(deleteStudent, null);

  return (
    <div
      className="card"
      style={{
        marginTop: "clamp(24px, 6vw, 32px)",
        padding: "clamp(20px, 5vw, 24px)",
        borderColor: "var(--danger)",
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <h3 style={{ margin: "0 0 8px 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--danger)" }}>
        Eliminar aluno
      </h3>
      <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Remove o registo de aluno, presenças, pagamentos, perfil, conquistas, notificações e a <strong>conta de login</strong> (Supabase Auth).
        Não é possível desfazer. Só disponível para utilizadores com perfil <strong>Aluno</strong>.
      </p>
      {!confirm ? (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          onClick={() => setConfirm(true)}
        >
          Eliminar aluno e conta
        </button>
      ) : (
        <form action={formAction}>
          <FormLoadingModal message="A remover o aluno e a conta…" />
          <input type="hidden" name="studentId" value={studentId} />
          <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "var(--text-primary)" }}>
            Confirmar eliminação definitiva de <strong>{studentName || studentEmail}</strong> ({studentEmail})?
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" className="btn" style={{ backgroundColor: "var(--danger)", color: "#fff", border: "none" }}>
              Sim, eliminar
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {state?.error && <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "var(--danger)" }}>{state.error}</p>}
    </div>
  );
}
