"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompetitionAthlete } from "@/lib/competition-athlete-actions";

type Props = {
  studentId: string;
  active: boolean;
};

export function CompetitionAthleteControls({ studentId, active }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onToggle = (value: boolean) => {
    startTransition(async () => {
      const r = await setCompetitionAthlete(studentId, value);
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
      aria-labelledby="competition-athlete-heading"
    >
      <h2
        id="competition-athlete-heading"
        style={{ margin: "0 0 8px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600 }}
      >
        Atleta de competição
      </h2>
      <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Alunos marcados aqui podem fazer check-in em aulas marcadas como &quot;Só atletas de competição&quot;.
        Separado da aba Atletas (que serve para XP, faixas e avaliações de desempenho).
      </p>
      {active ? (
        <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--success, #16a34a)" }}>
          Este aluno é atleta de competição.
        </p>
      ) : (
        <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)" }}>
          Este aluno não está marcado como atleta de competição.
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!active ? (
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => onToggle(true)}>
            {pending ? "A guardar…" : "Marcar como atleta de competição"}
          </button>
        ) : (
          <button type="button" className="btn btn-danger" disabled={pending} onClick={() => onToggle(false)}>
            {pending ? "A guardar…" : "Remover atleta de competição"}
          </button>
        )}
      </div>
    </section>
  );
}
