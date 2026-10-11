"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { bulkTodoAction, markTodoDoneAction, remindAdesaoAction, requestPhysicalAssessmentAction, type TodoActionState } from "./actions";

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

/** Ação em lote com confirmação em dois passos (envia a vários alunos). */
export function BulkTodoButton({ kind, schoolId, label, confirmLabel }: { kind: string; schoolId: string | null; label: string; confirmLabel: string }) {
  const [state, formAction] = useActionState(bulkTodoAction, null as TodoActionState);
  const [confirming, setConfirming] = useState(false);

  if (state?.ok) {
    return (
      <span role="status" style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>
        {state.count === 0 ? "Nada para enviar." : `Feito para ${state.count}.`}
      </span>
    );
  }
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ minHeight: 40, padding: "0 14px", borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff", font: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
      >
        {label}
      </button>
    );
  }
  return (
    <form action={formAction} style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="schoolId" value={schoolId ?? ""} />
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{confirmLabel}</span>
      <Submit variant="primary">Confirmar</Submit>
      <button type="button" onClick={() => setConfirming(false)} style={{ minHeight: 36, padding: "0 10px", border: "none", background: "transparent", color: "var(--text-secondary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        Cancelar
      </button>
      {state?.error ? <span style={{ width: "100%", textAlign: "right", fontSize: 12, color: "var(--danger)" }}>{state.error}</span> : null}
    </form>
  );
}

type SequenceItem = ItemFields & { url: string };

/**
 * «WhatsApp em sequência»: abre a conversa do aluno atual (mensagem já escrita); «Enviado → próximo»
 * marca-o como contactado e passa ao seguinte. Um de cada vez, porque o browser bloqueia várias janelas.
 */
export function WhatsAppSequence({ items, doneAction }: { items: SequenceItem[]; doneAction: string }) {
  // A fila é fixada ao começar: marcar «Feito» atualiza a página e a lista recebida encolhe.
  const [queue, setQueue] = useState<SequenceItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);

  if (!queue && items.length === 0) return null;
  if (!queue) {
    return (
      <button
        type="button"
        onClick={() => {
          setQueue(items);
          setIndex(0);
        }}
        style={{ minHeight: 40, padding: "0 14px", borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff", font: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
      >
        WhatsApp em sequência ({items.length})
      </button>
    );
  }
  if (index >= queue.length) {
    return (
      <span role="status" style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>
        Sequência concluída.
      </span>
    );
  }

  const cur = queue[index];
  const next = async (markDone: boolean) => {
    if (markDone) {
      setBusy(true);
      const fd = new FormData();
      fd.set("kind", cur.kind);
      fd.set("doneKey", cur.doneKey);
      fd.set("studentId", cur.studentId ?? "");
      fd.set("label", cur.label);
      fd.set("action", doneAction);
      await markTodoDoneAction(null, fd);
      setBusy(false);
    }
    setOpened(false);
    setIndex(index + 1);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        {index + 1} de {queue.length} · <b style={{ color: "var(--text-primary)" }}>{cur.label}</b>
      </span>
      <a
        href={cur.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpened(true)}
        style={{ minHeight: 38, padding: "0 12px", borderRadius: 10, background: opened ? "var(--bg)" : "var(--primary)", border: opened ? "1px solid var(--border)" : "none", color: opened ? "var(--text-primary)" : "#fff", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 800, textDecoration: "none" }}
      >
        Abrir WhatsApp
      </a>
      <button
        type="button"
        disabled={busy}
        onClick={() => void next(true)}
        style={{ minHeight: 38, padding: "0 12px", borderRadius: 10, border: "none", background: opened ? "var(--primary)" : "var(--bg)", color: opened ? "#fff" : "var(--text-primary)", font: "inherit", fontSize: 13, fontWeight: 800, cursor: busy ? "wait" : "pointer" }}
      >
        {busy ? "…" : "Enviado → próximo"}
      </button>
      <button type="button" disabled={busy} onClick={() => void next(false)} style={{ minHeight: 38, padding: "0 10px", border: "none", background: "transparent", color: "var(--text-secondary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        Saltar
      </button>
      <button type="button" onClick={() => setQueue(null)} style={{ minHeight: 38, padding: "0 10px", border: "none", background: "transparent", color: "var(--text-secondary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        Parar
      </button>
    </div>
  );
}
