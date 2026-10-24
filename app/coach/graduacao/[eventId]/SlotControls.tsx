"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { remindReadyStudents, setCandidateSlot } from "../actions";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
}

export function RemindReadyButton({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await remindReadyStudents(eventId);
            setMessage(r.error ?? `${r.notified} ${r.notified === 1 ? "aluno avisado" : "alunos avisados"}.`);
          })
        }
      >
        {pending ? "A avisar…" : "Avisar os aptos"}
      </button>
      {message && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{message}</span>}
    </span>
  );
}

/** Coach: mudar o horário de um convocado (pode ultrapassar as vagas). */
export function CandidateSlotSelect({
  candidateId,
  value,
  slots,
  counts,
  capacity,
}: {
  candidateId: string;
  value: string | null;
  slots: string[];
  counts: Record<string, number>;
  capacity: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = slots.find((s) => value && new Date(s).getTime() === new Date(value).getTime()) ?? "";
  return (
    <select
      className="input"
      aria-label="Horário"
      value={current}
      disabled={pending}
      style={{ width: "auto", minWidth: 110, padding: "6px 8px", fontSize: "var(--text-xs)" }}
      onChange={(e) =>
        start(async () => {
          const r = await setCandidateSlot(candidateId, e.target.value || null);
          if (r.error) window.alert(r.error);
          router.refresh();
        })
      }
    >
      <option value="">Sem horário</option>
      {slots.map((s) => {
        const n = counts[s] ?? 0;
        return (
          <option key={s} value={s}>
            {timeLabel(s)} ({n}/{capacity})
          </option>
        );
      })}
    </select>
  );
}
