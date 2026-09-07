"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { deleteCoach, deleteCoachAccount } from "../actions";

export function DeleteCoachButton({ coachId, coachName }: { coachId: string; coachName: string }) {
  const [confirm, setConfirm] = useState(false);
  const [state, formAction] = useFormState(deleteCoach, null);

  const [confirmAccount, setConfirmAccount] = useState(false);
  const [accountState, accountFormAction] = useFormState(deleteCoachAccount, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        className="card"
        style={{
          padding: "clamp(20px, 5vw, 24px)",
          borderColor: "var(--danger)",
          borderWidth: 1,
          borderStyle: "solid",
        }}
      >
        <h3 style={{ margin: "0 0 8px 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--danger)" }}>
          Excluir acesso de professor
        </h3>
        <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          Remove o acesso à área de professor. O utilizador continuará a poder fazer login como utilizador normal (sem área coach). Esta ação não pode ser desfeita.
        </p>
        {!confirm ? (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={() => setConfirm(true)}
          >
            Excluir coach e acesso
          </button>
        ) : (
          <form action={formAction}>
            <FormLoadingModal message="A remover o acesso de professor…" />
            <input type="hidden" name="coachId" value={coachId} />
            <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "var(--text-primary)" }}>
              Confirmar exclusão do acesso de <strong>{coachName}</strong>?
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" className="btn" style={{ backgroundColor: "var(--danger)", color: "#fff", border: "none" }}>
                Sim, excluir
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
        {state?.error && (
          <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "var(--danger)" }}>{state.error}</p>
        )}
      </div>

      <div
        className="card"
        style={{
          padding: "clamp(20px, 5vw, 24px)",
          borderColor: "var(--danger)",
          borderWidth: 2,
          borderStyle: "solid",
        }}
      >
        <h3 style={{ margin: "0 0 8px 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--danger)" }}>
          Eliminar conta definitivamente
        </h3>
        <p style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          Remove definitivamente esta conta (dados de coach, perfil de aluno associado, se existir, e a{" "}
          <strong>conta de login</strong> no Supabase Auth). Ao contrário da opção acima, o utilizador deixa de
          conseguir fazer login. Não é possível desfazer.
        </p>
        {!confirmAccount ? (
          <button
            type="button"
            className="btn"
            style={{ backgroundColor: "var(--danger)", color: "#fff", border: "none" }}
            onClick={() => setConfirmAccount(true)}
          >
            Eliminar conta definitivamente
          </button>
        ) : (
          <form action={accountFormAction}>
            <FormLoadingModal message="A eliminar a conta…" />
            <input type="hidden" name="coachId" value={coachId} />
            <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "var(--text-primary)" }}>
              Confirmar eliminação definitiva de <strong>{coachName}</strong>? Esta ação é irreversível.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" className="btn" style={{ backgroundColor: "var(--danger)", color: "#fff", border: "none" }}>
                Sim, eliminar definitivamente
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmAccount(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
        {accountState?.error && (
          <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "var(--danger)" }}>{accountState.error}</p>
        )}
      </div>
    </div>
  );
}
