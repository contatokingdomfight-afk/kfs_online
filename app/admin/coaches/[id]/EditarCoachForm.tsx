"use client";

import { useFormState } from "react-dom";
import { updateCoach, type UpdateCoachResult } from "../actions";

type Props = {
  coachId: string;
  initialName: string;
  initialSpecialties: string;
  studentId: string | null;
  initialCanCreateCourses: boolean;
};

export function EditarCoachForm({ coachId, initialName, initialSpecialties, studentId, initialCanCreateCourses }: Props) {
  const [state, formAction] = useFormState(updateCoach, null as UpdateCoachResult | null);

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
      <input type="hidden" name="coachId" value={coachId} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome
        </span>
        <input
          type="text"
          name="name"
          defaultValue={initialName}
          className="input"
          placeholder="Nome completo"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Especialidades
        </span>
        <input
          type="text"
          name="specialties"
          defaultValue={initialSpecialties}
          className="input"
          placeholder="ex: Muay Thai, Boxing"
        />
      </label>

      {studentId && (
        <div
          style={{
            padding: "clamp(14px, 3.5vw, 16px)",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            borderLeft: "3px solid var(--primary)",
          }}
        >
          <p style={{ margin: "0 0 10px 0", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Permissões especiais
          </p>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              name="can_create_courses"
              defaultChecked={initialCanCreateCourses}
              value="on"
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <div>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", fontWeight: 500 }}>
                Autorizado a criar cursos
              </span>
              <p style={{ margin: "2px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                Este coach poderá publicar cursos na plataforma. A receita será dividida: 65% para o coach, 35% para a KFS.
              </p>
            </div>
          </label>
        </div>
      )}

      {!studentId && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
          Este coach não tem perfil de aluno vinculado. Para autorizar criação de cursos, o coach precisa ter um perfil de aluno.
        </p>
      )}

      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--success)" }}>Guardado com sucesso!</p>
      )}
      <button type="submit" className="btn btn-primary">
        Guardar
      </button>
    </form>
  );
}
