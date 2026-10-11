"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { markTodoDoneAction, remindAdesaoAction, requestPhysicalAssessmentAction, type TodoActionState } from "./actions";

type ItemFields = { kind: string; doneKey: string; studentId: string | null; label: string };

const ACTIONS = {
  done: markTodoDoneAction,
  remind: remindAdesaoAction,
  request: requestPhysicalAssessmentAction,
} as const;

function Submit({ children, variant }: { children: React.ReactNode; variant: "primary" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        minHeight: 36,
        padding: "0 12px",
        borderRadius: 10,
        border: variant === "primary" ? "1px solid var(--border)" : "none",
        background: variant === "primary" ? "var(--bg)" : "transparent",
        color: variant === "primary" ? "var(--text-primary)" : "var(--text-secondary)",
        font: "inherit",
        fontSize: 13,
        fontWeight: variant === "primary" ? 800 : 700,
        cursor: pending ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}

/** Botão que corre uma acção do «A tratar» (Feito, Lembrar, Pedir avaliação) para um item. */
export function TodoActionButton({
  action,
  item,
  label,
  variant = "ghost",
  doneAction,
}: {
  action: keyof typeof ACTIONS;
  item: ItemFields;
  label: string;
  variant?: "primary" | "ghost";
  /** Nome guardado no histórico para «Feito» (ex.: «contactado»). */
  doneAction?: string;
}) {
  const [state, formAction] = useActionState(ACTIONS[action], null as TodoActionState);
  return (
    <form action={formAction} style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
      <input type="hidden" name="kind" value={item.kind} />
      <input type="hidden" name="doneKey" value={item.doneKey} />
      <input type="hidden" name="studentId" value={item.studentId ?? ""} />
      <input type="hidden" name="label" value={item.label} />
      {doneAction ? <input type="hidden" name="action" value={doneAction} /> : null}
      <Submit variant={variant}>{label}</Submit>
      {state?.error ? <span style={{ fontSize: 11, color: "var(--danger)", maxWidth: 160, textAlign: "right" }}>{state.error}</span> : null}
    </form>
  );
}
