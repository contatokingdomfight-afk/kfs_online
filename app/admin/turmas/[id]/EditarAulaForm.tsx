"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UpdateLessonResult } from "@/lib/admin/update-lesson";

type CoachOption = { id: string; name: string };
type LocationOption = { id: string; name: string };
type ModalityOption = { code: string; name: string };

type Props = {
  lessonId: string;
  /** Query string (sem `?`) para voltar à mesma vista da agenda. */
  turmasReturnQuery: string;
  /** Se false, ao guardar aplicam-se alterações a todas as futuras da série (cada data semanal mantém-se). */
  isOneOff: boolean;
  initialModality: string;
  initialDate: string;
  initialStartTime: string;
  initialEndTime: string;
  initialCoachId: string;
  initialLocationId: string;
  initialCapacity: string | number;
  initialPlanningNotes: string;
  initialIsOpenClass?: boolean;
  coachOptions: CoachOption[];
  locationOptions: LocationOption[];
  modalityOptions: ModalityOption[];
};

export function EditarAulaForm({
  lessonId,
  turmasReturnQuery,
  isOneOff,
  initialModality,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialCoachId,
  initialLocationId,
  initialCapacity,
  initialPlanningNotes,
  initialIsOpenClass = false,
  coachOptions,
  locationOptions,
  modalityOptions,
}: Props) {
  const router = useRouter();
  const redirectOnce = useRef(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<UpdateLessonResult | null>(null);

  useEffect(() => {
    if (state?.success && !redirectOnce.current) {
      redirectOnce.current = true;
      const href = turmasReturnQuery ? `/admin/turmas?${turmasReturnQuery}` : "/admin/turmas";
      router.push(href);
    }
  }, [state?.success, router, turmasReturnQuery]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const capacityRaw = (fd.get("capacity") as string | null)?.trim() ?? "";
    const payload = {
      lessonId,
      modality: (fd.get("modality") as string) ?? "",
      date: (fd.get("date") as string) ?? "",
      startTime: (fd.get("startTime") as string) ?? "",
      endTime: (fd.get("endTime") as string) ?? "",
      coachId: (fd.get("coachId") as string) ?? "",
      locationId: ((fd.get("locationId") as string) || "").trim() || null,
      capacity: capacityRaw === "" ? null : capacityRaw,
      planningNotes: ((fd.get("planningNotes") as string) || "").trim() || null,
      isOpenClass: fd.get("isOpenClass") === "on",
    };
    try {
      const res = await fetch("/api/admin/turmas/update-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as UpdateLessonResult;
      if (res.status === 403) {
        setState({ error: result.error ?? "Não autorizado." });
        return;
      }
      if (!res.ok) {
        setState({ error: result.error ?? "Pedido inválido." });
        return;
      }
      if (result.error) {
        setState({ error: result.error });
        return;
      }
      if (result.success) {
        setState({ success: true });
      }
    } catch {
      setState({ error: "Erro ao guardar alterações." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
      }}
    >
      {pending ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          aria-live="polite"
          aria-label="A guardar alterações"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            boxSizing: "border-box",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 280,
              padding: "clamp(24px, 5vw, 32px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <div
              role="progressbar"
              aria-valuetext="A guardar alterações"
              style={{
                width: 40,
                height: 40,
                border: "3px solid var(--border)",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
                animation: "edit-lesson-spin 0.8s linear infinite",
              }}
            />
            <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 500, color: "var(--text-primary)" }}>
              A guardar alterações…
            </p>
            <style>{`
              @keyframes edit-lesson-spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      ) : null}
      <input type="hidden" name="lessonId" value={lessonId} />
      {!isOneOff && (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(13px, 3.2vw, 15px)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Ao guardar, <strong>modalidade, horários, coach, local e restantes campos</strong> aplicam-se a <strong>esta e a todas as
          futuras</strong> da mesma série semanal. A data de cada semana mantém-se.
        </p>
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Modalidade *
        </span>
        <select name="modality" required defaultValue={initialModality} className="input">
          {modalityOptions.map((m) => (
            <option key={m.code} value={m.code}>{m.name}</option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(12px, 3vw, 16px)" }}>
        <label style={{ flex: "1 1 140px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            Data *
          </span>
          <input type="date" name="date" required defaultValue={initialDate} className="input" />
        </label>
        <label style={{ flex: "0 1 100px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            Início *
          </span>
          <input type="time" name="startTime" required defaultValue={initialStartTime} className="input" />
        </label>
        <label style={{ flex: "0 1 100px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
            Fim *
          </span>
          <input type="time" name="endTime" required defaultValue={initialEndTime} className="input" />
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Local
        </span>
        <select name="locationId" defaultValue={initialLocationId || ""} className="input">
          <option value="">— Sem local —</option>
          {locationOptions.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Coach *
        </span>
        <select name="coachId" required defaultValue={initialCoachId} className="input">
          {coachOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Capacidade
        </span>
        <input
          type="number"
          name="capacity"
          min={1}
          defaultValue={initialCapacity || ""}
          placeholder="—"
          className="input"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Notas de planeamento
        </span>
        <input
          type="text"
          name="planningNotes"
          defaultValue={initialPlanningNotes}
          placeholder="Ex: foco em defesa"
          className="input"
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input
          type="checkbox"
          name="isOpenClass"
          defaultChecked={initialIsOpenClass}
          style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
        />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Aula livre (aberta a alunos de qualquer modalidade da escola)
        </span>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--success)" }}>
          Alterações guardadas.
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        Guardar
      </button>
    </form>
  );
}
