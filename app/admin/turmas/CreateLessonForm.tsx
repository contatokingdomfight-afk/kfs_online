"use client";

import { useFormState } from "react-dom";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { createLesson } from "./actions";

type Coach = { id: string; name: string };
type Modality = { code: string; name: string };
type School = { id: string; name: string };

export function CreateLessonForm({ coaches, modalities, schools }: { coaches: Coach[]; modalities: Modality[]; schools: School[] }) {
  const [state, formAction] = useFormState(
    async (_: unknown, formData: FormData) => {
      return await createLesson(formData);
    },
    null as { error?: string; success?: boolean; message?: string; created?: number } | null
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <FormLoadingModal message="A aula está a ser criada…" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <label style={{ flex: "1 1 140px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#a1a1aa" }}>
            Modalidade
          </span>
          <select
            name="modality"
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 14,
            }}
          >
            <option value="">Selecionar</option>
            {modalities.map((m) => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: "1 1 140px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#a1a1aa" }}>
            Data
          </span>
          <input
            type="date"
            name="date"
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 14,
            }}
          />
        </label>
        <label style={{ flex: "0 1 100px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#a1a1aa" }}>
            Início
          </span>
          <input
            type="time"
            name="startTime"
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 14,
            }}
          />
        </label>
        <label style={{ flex: "0 1 100px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#a1a1aa" }}>
            Fim
          </span>
          <input
            type="time"
            name="endTime"
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 14,
            }}
          />
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <label style={{ flex: "1 1 180px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--text-secondary)" }}>
            Escola *
          </span>
          <select
            name="schoolId"
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 14,
            }}
          >
            <option value="">— Selecionar —</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: "1 1 180px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--text-secondary)" }}>
            Coach *
          </span>
          <select
            name="coachId"
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 14,
            }}
          >
            <option value="">— Selecionar —</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: "0 1 80px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#a1a1aa" }}>
            Capacidade
          </span>
          <input
            type="number"
            name="capacity"
            min={1}
            placeholder="—"
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 14,
            }}
          />
        </label>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input type="checkbox" name="isOneOff" value="on" style={{ width: 18, height: 18, accentColor: "#c1121f" }} />
        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
          Aula única (evento pontual) — se não marcar, são criadas 12 aulas com recorrência semanal no mesmo dia e hora
        </span>
      </label>
      <label style={{ minWidth: 0 }}>
        <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "#a1a1aa" }}>
          Notas de planeamento (opcional)
        </span>
        <input
          type="text"
          name="planningNotes"
          placeholder="Ex: foco em defesa"
          style={{
            width: "100%",
            padding: "8px 12px",
            backgroundColor: "#0b0b0b",
            border: "1px solid #27272a",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: 14,
          }}
        />
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: 14, color: "#e11d48" }}>{state.error}</p>
      )}
      {state?.success && (
        <p style={{ margin: 0, fontSize: 14, color: "#22c55e" }}>{state.message ?? "Aula criada."}</p>
      )}
      <button
        type="submit"
        style={{
          alignSelf: "flex-start",
          padding: "10px 20px",
          backgroundColor: "#c1121f",
          border: "none",
          borderRadius: 8,
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Criar aula
      </button>
    </form>
  );
}
