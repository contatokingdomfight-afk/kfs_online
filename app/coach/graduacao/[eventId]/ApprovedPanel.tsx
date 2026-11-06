"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { setBeltDelivered } from "../actions";

export type ApprovedRow = {
  id: string;
  studentName: string;
  gradeId: string;
  gradeName: string;
  gradeColors: string[];
  gradeOrder: number;
  previousGradeName: string | null;
  note: string | null;
  revealed: boolean;
  delivered: boolean;
};

type Filter = "all" | "todo" | "done";

export function ApprovedPanel({ rows, revealLabel }: { rows: ApprovedRow[]; revealLabel: string | null }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [delivered, setDelivered] = useState(() => new Map(rows.map((r) => [r.id, r.delivered])));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const byGrade = new Map<string, { name: string; colors: string[]; order: number; rows: ApprovedRow[] }>();
    for (const r of rows) {
      const g = byGrade.get(r.gradeId) ?? { name: r.gradeName, colors: r.gradeColors, order: r.gradeOrder, rows: [] };
      g.rows.push(r);
      byGrade.set(r.gradeId, g);
    }
    return [...byGrade.values()].sort((a, b) => a.order - b.order);
  }, [rows]);

  const deliveredCount = rows.filter((r) => delivered.get(r.id)).length;

  function toggle(id: string) {
    const next = !delivered.get(id);
    setDelivered((m) => new Map(m).set(id, next));
    setError(null);
    startTransition(async () => {
      const res = await setBeltDelivered(id, next);
      if (res.error) {
        setDelivered((m) => new Map(m).set(id, !next));
        setError(res.error);
      }
    });
  }

  if (rows.length === 0) {
    return <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>Ainda não há alunos aprovados neste exame.</p>;
  }

  const chip = (id: Filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      style={{
        border: `1px solid ${filter === id ? "var(--text-primary)" : "var(--border)"}`,
        color: filter === id ? "var(--text-primary)" : "var(--text-secondary)",
        background: "transparent",
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: "var(--text-xs)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <b style={{ fontSize: 22, display: "block" }}>{rows.length}</b>
          <small style={{ color: "var(--text-secondary)" }}>{rows.length === 1 ? "aprovado" : "aprovados"}</small>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <b style={{ fontSize: 22, display: "block" }}>
            {deliveredCount} / {rows.length}
          </b>
          <small style={{ color: "var(--text-secondary)" }}>graduações entregues</small>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <b style={{ fontSize: 16, display: "block", lineHeight: "28px" }}>{revealLabel ?? "Sem data"}</b>
          <small style={{ color: "var(--text-secondary)" }}>revelação · certificados</small>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }} aria-labelledby="a-preparar">
        <h2 id="a-preparar" style={{ margin: "0 0 8px", fontSize: "var(--text-base)", fontWeight: 700 }}>
          A preparar
        </h2>
        {groups.map((g) => {
          const todo = g.rows.filter((r) => !delivered.get(r.id)).length;
          return (
            <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px dashed var(--border)" }}>
              <BeltSwatch colors={g.colors} width={56} height={12} />
              <span style={{ flex: 1, fontSize: "var(--text-sm)" }}>{g.name}</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{todo === 0 ? "tudo entregue" : `${todo} por entregar`}</span>
              <b style={{ fontSize: 16, minWidth: 32, textAlign: "right" }}>×{g.rows.length}</b>
            </div>
          );
        })}
      </section>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {chip("all", "Todos")}
        {chip("todo", "Por entregar")}
        {chip("done", "Entregues")}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary" onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Printer size={15} aria-hidden /> Imprimir lista
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: "0 0 10px" }}>{error}</p>}

      {groups.map((g) => {
        const visible = g.rows.filter((r) => (filter === "all" ? true : filter === "done" ? delivered.get(r.id) : !delivered.get(r.id)));
        if (visible.length === 0) return null;
        return (
          <section key={g.name} style={{ marginBottom: 16 }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 8px", fontSize: "var(--text-sm)", fontWeight: 700 }}>
              <BeltSwatch colors={g.colors} width={40} height={10} />
              {g.name}
              <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>· {g.rows.length}</span>
            </h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {visible.map((r) => {
                const isDone = Boolean(delivered.get(r.id));
                return (
                  <li key={r.id} className="card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                        {[r.previousGradeName ? `Antes: ${r.previousGradeName}` : r.note ? null : "Primeiro grau", r.note].filter(Boolean).join(" · ")}
                        {" · "}
                        {r.revealed ? (
                          <Link href={`/certificado/${r.id}`} target="_blank" style={{ color: "inherit" }}>
                            certificado emitido
                          </Link>
                        ) : (
                          "certificado na revelação"
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(r.id)}
                      disabled={pending}
                      className={isDone ? "btn btn-secondary" : "btn btn-primary"}
                      aria-pressed={isDone}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {isDone ? "✓ Entregue" : "Marcar entregue"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
