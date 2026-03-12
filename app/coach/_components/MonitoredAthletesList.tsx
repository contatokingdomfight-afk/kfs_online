"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Athlete = {
  studentId: string;
  name: string | null;
  level: string;
};

type Props = {
  athletes: Athlete[];
  title: string;
  searchPlaceholder: string;
  levelLabels: Record<string, string>;
  emptyMessage: string;
  noResultsMessage: string;
};

export function MonitoredAthletesList({
  athletes,
  title,
  searchPlaceholder,
  levelLabels,
  emptyMessage,
  noResultsMessage,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return athletes;
    const q = query.trim().toLowerCase();
    return athletes.filter(
      (a) =>
        (a.name ?? "").toLowerCase().includes(q) ||
        (levelLabels[a.level] ?? a.level).toLowerCase().includes(q)
    );
  }, [athletes, query, levelLabels]);

  return (
    <section
      className="card"
      style={{ padding: "clamp(18px, 4.5vw, 24px)" }}
    >
      <h2
        style={{
          margin: "0 0 clamp(12px, 3vw, 16px) 0",
          fontSize: "clamp(16px, 4vw, 18px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h2>
      <input
        type="search"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={searchPlaceholder}
        style={{
          width: "100%",
          padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 14px)",
          marginBottom: "clamp(12px, 3vw, 16px)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg)",
          color: "var(--text-primary)",
          fontSize: "clamp(14px, 3.5vw, 16px)",
        }}
      />
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          maxHeight: 280,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(6px, 1.5vw, 8px)",
        }}
      >
        {filtered.length === 0 ? (
          <li
            style={{
              padding: "clamp(12px, 3vw, 16px)",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "var(--text-secondary)",
            }}
          >
            {athletes.length === 0 ? emptyMessage : noResultsMessage}
          </li>
        ) : (
          filtered.map((a) => (
            <li key={a.studentId}>
              <Link
                href={`/coach/alunos/${a.studentId}/performance`}
                style={{
                  display: "block",
                  padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 14px)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg)",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "var(--text-primary)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontWeight: 500 }}>{a.name || "—"}</span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: "clamp(12px, 3vw, 14px)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {levelLabels[a.level] ?? a.level}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
