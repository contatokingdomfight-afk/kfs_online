"use client";

import { useFormState } from "react-dom";
import { createEvent, updateEvent, type EventFormResult } from "./actions";

const TYPES = [
  { value: "CAMP", label: "Camp" },
  { value: "WORKSHOP", label: "Workshop" },
] as const;

type Props = {
  eventId?: string;
  initialName?: string;
  initialDescription?: string;
  initialType?: string;
  initialEventDate?: string;
  initialPrice?: number;
  initialMaxParticipants?: number | null;
  initialIsActive?: boolean;
};

export function EventForm({
  eventId,
  initialName = "",
  initialDescription = "",
  initialType = "WORKSHOP",
  initialEventDate = "",
  initialPrice = 0,
  initialMaxParticipants = null,
  initialIsActive = true,
}: Props) {
  const action = eventId ? updateEvent : createEvent;
  const [state, formAction] = useFormState(action, null as EventFormResult | null);

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
      {eventId && <input type="hidden" name="eventId" value={eventId} />}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome do evento
        </span>
        <input
          type="text"
          name="name"
          defaultValue={initialName}
          className="input"
          placeholder="Ex.: Kingdom Fight Camp Intermédio"
          required
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Descrição
        </span>
        <textarea
          name="description"
          defaultValue={initialDescription}
          className="input"
          placeholder="O que inclui o evento?"
          rows={3}
          style={{ resize: "vertical" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Tipo
        </span>
        <select name="type" className="input" defaultValue={initialType}>
          {TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Data do evento
        </span>
        <input
          type="date"
          name="event_date"
          defaultValue={initialEventDate}
          className="input"
          required
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Preço (€)
        </span>
        <input
          type="number"
          name="price"
          defaultValue={initialPrice}
          className="input"
          min={0}
          step={0.01}
          required
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Lotação máxima (opcional)
        </span>
        <input
          type="number"
          name="max_participants"
          defaultValue={initialMaxParticipants ?? ""}
          className="input"
          min={0}
          placeholder="Ilimitado"
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" name="is_active" defaultChecked={initialIsActive} value="on" />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Evento ativo (visível para inscrições)
        </span>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }}>
        {eventId ? "Guardar" : "Criar evento"}
      </button>
    </form>
  );
}
