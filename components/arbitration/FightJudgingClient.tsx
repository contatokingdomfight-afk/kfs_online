"use client";

import { useState } from "react";
import { JudgingPanel } from "@/components/arbitration/JudgingPanel";
import type { FightJudgeAssignment } from "@/lib/arbitration/types";

type InitialState = NonNullable<Awaited<ReturnType<typeof import("@/app/coach/arbitragem/actions").getFightJudgingState>>>;

type Props = {
  fightId: string;
  assignments: FightJudgeAssignment[];
  suggestedFightJudgeId: string | null;
  initialByJudge: Record<string, InitialState>;
};

export function FightJudgingClient({
  fightId,
  assignments,
  suggestedFightJudgeId,
  initialByJudge,
}: Props) {
  const defaultId =
    suggestedFightJudgeId ?? (assignments.length === 1 ? assignments[0]?.id : null);
  const [fightJudgeId, setFightJudgeId] = useState<string | null>(defaultId);

  if (assignments.length === 0) {
    return (
      <div className="arb-card arb-empty">
        <p>Nenhum juiz atribuído a este combate.</p>
        <p style={{ fontSize: 14, marginTop: 8 }}>Configure juízes em Gestão antes de julgar.</p>
      </div>
    );
  }

  if (!fightJudgeId) {
    return (
      <div className="arb-card">
        <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Seleccione o seu posto de juiz</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {assignments.map((a) => (
            <button
              key={a.id}
              type="button"
              className="btn btn-primary"
              style={{ minHeight: 52, fontWeight: 700 }}
              onClick={() => setFightJudgeId(a.id)}
            >
              Juiz {a.judgeNumber} — {a.judge.displayName}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const assignment = assignments.find((a) => a.id === fightJudgeId);
  const initial = initialByJudge[fightJudgeId];
  if (!assignment || !initial) return null;

  return (
    <JudgingPanel
      fightId={fightId}
      fightJudgeId={fightJudgeId}
      judgeLabel={`Juiz ${assignment.judgeNumber} — ${assignment.judge.displayName}`}
      initial={initial}
    />
  );
}
