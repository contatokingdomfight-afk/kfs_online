"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteSchoolAssistantCoach, revokeSchoolAssistantCoach } from "@/app/coach/school-assistant-actions";

type Props = {
  studentId: string;
  assistantActive: boolean;
  /** Só contas com role ALUNO podem ser assistentes. */
  targetUserRole: string | null | undefined;
  studentStatus: string;
};

export function SchoolAssistantCoachControls({
  studentId,
  assistantActive,
  targetUserRole,
  studentStatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (targetUserRole !== "ALUNO") return null;
  if (studentStatus === "INATIVO") return null;

  const onPromote = () => {
    startTransition(async () => {
      const r = await promoteSchoolAssistantCoach(studentId);
      if (r.error) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  };

  const onRevoke = () => {
    if (!confirm("Revogar o papel de treinador assistente nesta escola?")) return;
    startTransition(async () => {
      const r = await revokeSchoolAssistantCoach(studentId);
      if (r.error) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section
      className="card"
      style={{
        marginTop: 16,
        padding: "clamp(14px, 3.5vw, 18px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
      }}
      aria-labelledby="school-assistant-heading"
    >
      <h2
        id="school-assistant-heading"
        style={{ margin: "0 0 8px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600 }}
      >
        Treinador assistente (escola)
      </h2>
      <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        O assistente pode marcar presenças nas aulas da escola. Não acede a avaliações de desempenho nem à lista global de
        alunos.
      </p>
      {assistantActive ? (
        <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--success, #16a34a)" }}>
          Este aluno é treinador assistente activo.
        </p>
      ) : (
        <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)" }}>
          Este aluno não está como assistente.
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!assistantActive ? (
          <button type="button" className="btn btn-primary" disabled={pending} onClick={onPromote}>
            {pending ? "A guardar…" : "Promover a assistente"}
          </button>
        ) : (
          <button type="button" className="btn btn-danger" disabled={pending} onClick={onRevoke}>
            {pending ? "A guardar…" : "Revogar assistente"}
          </button>
        )}
      </div>
    </section>
  );
}
