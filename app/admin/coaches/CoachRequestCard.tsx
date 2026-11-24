"use client";

import { useActionState, useState } from "react";
import {
  approveCoachAccessRequest,
  rejectCoachAccessRequest,
  type CoachRequestDecisionResult,
} from "./actions";

export type CoachRequestView = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  schoolName: string;
  createdAt: string;
  requestedCodes: string[];
  modalities: { code: string; name: string }[];
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function CoachRequestCard({ request }: { request: CoachRequestView }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(request.requestedCodes));
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approveAction, approving] = useActionState<CoachRequestDecisionResult | null, FormData>(
    approveCoachAccessRequest,
    null
  );
  const [rejectState, rejectAction, rejectingPending] = useActionState<CoachRequestDecisionResult | null, FormData>(
    rejectCoachAccessRequest,
    null
  );
  const error = approveState?.error ?? rejectState?.error;

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials(request.name)}
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: "clamp(15px, 3.8vw, 17px)" }}>{request.name}</span>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
            {request.email}
            {request.phone ? ` · ${request.phone}` : ""} · {request.schoolName} ·{" "}
            {new Date(request.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
          </p>
        </div>

        <form action={approveAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="hidden" name="requestId" value={request.id} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Modalidades (contam para a remuneração)</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {request.modalities.map((m) => {
              const on = selected.has(m.code);
              return (
                <label
                  key={m.code}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontSize: 13,
                    border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                    background: on ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "var(--bg-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    name="modalityCodes"
                    value={m.code}
                    checked={on}
                    onChange={() => toggle(m.code)}
                    style={{ margin: 0 }}
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
            Se uma modalidade tiver mais do que um professor, a parte dela divide-se em partes iguais.
          </p>
          {!rejecting && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary" disabled={approving || selected.size === 0}>
                {approving ? "A aprovar…" : "Aprovar como professor"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setRejecting(true)}>
                Recusar
              </button>
            </div>
          )}
        </form>

        {rejecting && (
          <form action={rejectAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="hidden" name="requestId" value={request.id} />
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
              Motivo (opcional, vai no email ao professor)
              <input name="reason" className="input" maxLength={300} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary" disabled={rejectingPending}>
                {rejectingPending ? "A recusar…" : "Confirmar recusa"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setRejecting(false)}>
                Voltar
              </button>
            </div>
          </form>
        )}

        {error && (
          <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
