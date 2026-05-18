"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { createLesson } from "./actions";

type Coach = { id: string; name: string; schoolIds: string[] };
type Modality = { code: string; name: string };
type School = { id: string; name: string };
type Weekday = { value: string; label: string };

const WEEKDAYS: Weekday[] = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
  { value: "7", label: "Dom" },
];

export function CreateLessonForm({ coaches, modalities, schools }: { coaches: Coach[]; modalities: Modality[]; schools: School[] }) {
  const [isOneOff, setIsOneOff] = useState(false);
  const [weekday, setWeekday] = useState<string>("1");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const coachesForSchool = useMemo(
    () =>
      selectedSchoolId ? coaches.filter((c) => c.schoolIds.includes(selectedSchoolId)) : [],
    [coaches, selectedSchoolId]
  );
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
        {isOneOff ? (
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
        ) : (
          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <span style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#a1a1aa" }}>
              Dia da semana
            </span>
            <input type="hidden" name="weekday" value={weekday} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {WEEKDAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setWeekday(d.value)}
                  aria-pressed={weekday === d.value}
                  style={{
                    minWidth: 42,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: weekday === d.value ? "1px solid var(--primary)" : "1px solid #27272a",
                    backgroundColor: weekday === d.value ? "var(--primary)" : "#0b0b0b",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
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
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <span style={{ display: "block", marginBottom: 6, fontSize: 12, color: "var(--text-secondary)" }}>
            Professores * (podes marcar vários)
          </span>
          <div
            key={selectedSchoolId || "no-school"}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "10px 12px",
              backgroundColor: "#0b0b0b",
              border: "1px solid #27272a",
              borderRadius: 6,
              opacity: selectedSchoolId ? 1 : 0.6,
              pointerEvents: selectedSchoolId ? "auto" : "none",
            }}
          >
            {!selectedSchoolId ? (
              <span style={{ fontSize: 13, color: "#a1a1aa" }}>Escolhe primeiro a escola.</span>
            ) : (
              coachesForSchool.map((c) => (
                <label
                  key={c.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#fff", cursor: "pointer" }}
                >
                  <input type="checkbox" name="coachIds" value={c.id} style={{ width: 18, height: 18, accentColor: "#c1121f" }} />
                  {c.name}
                </label>
              ))
            )}
          </div>
          {selectedSchoolId && coachesForSchool.length === 0 && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#f97316" }}>
              Não há coaches nesta escola. Associa um coach a esta escola antes de criar a aula.
            </p>
          )}
        </div>
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
        <input
          type="checkbox"
          name="isOneOff"
          value="on"
          checked={isOneOff}
          onChange={(e) => setIsOneOff(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: "#c1121f" }}
        />
        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
          Aula única (evento pontual) — se não marcar, fica registada uma aula semanal (mesmo dia e hora todas as semanas)
        </span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input type="checkbox" name="isOpenClass" value="on" style={{ width: 18, height: 18, accentColor: "#c1121f" }} />
        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
          Aula livre (aberta a alunos de qualquer modalidade da escola)
        </span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input type="checkbox" name="excludeTrialBooking" value="on" style={{ width: 18, height: 18, accentColor: "#c1121f" }} />
        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
          Ocultar do formulário público de aula experimental (/aula-experimental)
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
