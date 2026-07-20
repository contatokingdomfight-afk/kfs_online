"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { cancelGoal, completeGoal, deleteGoalEntry, type GoalActionResult } from "../actions";
import { AdminGoalEntryForm } from "../AdminGoalEntryForm";
import { AdminGoalForm } from "../AdminGoalForm";
import {
  formatGoalValue,
  GOAL_METRIC_LABELS_PT,
  GOAL_STATUS_LABELS_PT,
  isGoalOverdue,
  progressPercent,
  type AdminGoalWithSchool,
  type AdminGoalEntryRow,
} from "@/lib/admin-business-goals";

type SchoolOption = { id: string; name: string };

type EntryWithAuthor = AdminGoalEntryRow & { authorName: string };

type Props = {
  goal: AdminGoalWithSchool;
  entries: EntryWithAuthor[];
  schools: SchoolOption[];
};

export function AdminGoalDetailClient({ goal, entries, schools }: Props) {
  const [cancelState, cancelAction] = useFormState(cancelGoal, null as GoalActionResult | null);
  const [completeState, completeAction] = useFormState(completeGoal, null as GoalActionResult | null);
  const pct = progressPercent(goal.currentValue, goal.targetValue);
  const overdue = isGoalOverdue(goal);
  const canPost = goal.status !== "CANCELLED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      <Link href="/admin/metas" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Voltar às metas
      </Link>

      <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, flex: 1 }}>{goal.title}</h1>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "var(--bg)" }}>
            {GOAL_METRIC_LABELS_PT[goal.metricType]}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "var(--bg)" }}>
            {overdue && goal.status === "ACTIVE" ? "Em atraso" : GOAL_STATUS_LABELS_PT[goal.status]}
          </span>
        </div>

        {goal.description && (
          <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.45 }}>{goal.description}</p>
        )}

        <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {formatGoalValue(goal.metricType, goal.currentValue)} / {formatGoalValue(goal.metricType, goal.targetValue)}
        </p>

        <div style={{ height: 10, borderRadius: 999, background: "var(--bg)", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "var(--primary)",
              borderRadius: 999,
            }}
          />
        </div>

        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          {goal.schoolId ? goal.schoolName ?? "Escola" : "Global"} · {goal.startDate.slice(0, 10)} →{" "}
          {goal.targetEndDate.slice(0, 10)} · {pct}%
        </p>

        {goal.status === "ACTIVE" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <form action={completeAction}>
              <input type="hidden" name="goalId" value={goal.id} />
              <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
                Marcar como concluída
              </button>
            </form>
            <form action={cancelAction}>
              <input type="hidden" name="goalId" value={goal.id} />
              <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
                Cancelar meta
              </button>
            </form>
          </div>
        )}
        {(cancelState?.error || completeState?.error) && (
          <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{cancelState?.error || completeState?.error}</p>
        )}
      </div>

      <AdminGoalEntryForm goalId={goal.id} metricType={goal.metricType} disabled={!canPost} />

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 600 }}>Histórico de lançamentos</h2>
        {entries.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Ainda não há lançamentos.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} goalId={goal.id} metricType={goal.metricType} />
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ padding: 18 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600 }}>Editar meta</h2>
        <AdminGoalForm schools={schools} goal={goal} />
      </section>
    </div>
  );
}

function EntryRow({
  entry,
  goalId,
  metricType,
}: {
  entry: EntryWithAuthor;
  goalId: string;
  metricType: AdminGoalWithSchool["metricType"];
}) {
  const [state, action] = useFormState(deleteGoalEntry, null as GoalActionResult | null);
  const sign = entry.deltaValue >= 0 ? "+" : "";

  return (
    <li className="card" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {sign}
          {formatGoalValue(metricType, entry.deltaValue)}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          {entry.recordedAt.slice(0, 10)} · {entry.authorName}
          {entry.note ? ` · ${entry.note}` : ""}
        </p>
      </div>
      <form action={action}>
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="goalId" value={goalId} />
        <button type="submit" className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}>
          Remover
        </button>
      </form>
      {state?.error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{state.error}</span>}
    </li>
  );
}
