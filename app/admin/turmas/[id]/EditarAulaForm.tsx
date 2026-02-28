"use client";

import { useFormState } from "react-dom";
import { updateLesson, type UpdateLessonResult } from "../actions";

type CoachOption = { id: string; name: string };
type LocationOption = { id: string; name: string };
type ModalityOption = { code: string; name: string };

type Props = {
  lessonId: string;
  initialModality: string;
  initialDate: string;
  initialStartTime: string;
  initialEndTime: string;
  initialCoachId: string;
  initialLocationId: string;
  initialCapacity: string | number;
  initialPlanningNotes: string;
  coachOptions: CoachOption[];
  locationOptions: LocationOption[];
  modalityOptions: ModalityOption[];
};

export function EditarAulaForm({
  lessonId,
  initialModality,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialCoachId,
  initialLocationId,
  initialCapacity,
  initialPlanningNotes,
  coachOptions,
  locationOptions,
  modalityOptions,
}: Props) {
  const [state, formAction] = useFormState(updateLesson, null as UpdateLessonResult | null);

  return (
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
      <input type="hidden" name="lessonId" value={lessonId} />
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
      <button type="submit" className="btn btn-primary">
        Guardar
      </button>
    </form>
  );
}
