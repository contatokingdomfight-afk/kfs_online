"use client";

import Link from "next/link";

type Lesson = {
  id: string;
  modality: string;
  startTime: string;
  endTime: string;
};

type Props = {
  scenario: "in_class" | "next" | "rest";
  lesson: Lesson | null;
  modalityLabel: string;
  summary: string;
  manageLabel: string;
  restMessage: string;
};

export function CurrentOrNextClassCard({
  scenario,
  lesson,
  modalityLabel,
  summary,
  manageLabel,
  restMessage,
}: Props) {
  if (scenario === "rest") {
    return (
      <section
        className="card"
        style={{
          padding: "clamp(20px, 5vw, 28px)",
          textAlign: "center",
          border: "2px dashed var(--border)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(15px, 3.8vw, 17px)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {restMessage}
        </p>
      </section>
    );
  }

  if (!lesson) return null;

  const title =
    scenario === "in_class"
      ? "EM AULA AGORA"
      : "SUA PRÓXIMA AULA";

  return (
    <section
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 28px)",
        borderLeft: scenario === "in_class" ? "4px solid var(--primary)" : undefined,
      }}
    >
      <p
        style={{
          margin: "0 0 clamp(8px, 2vw, 12px) 0",
          fontSize: "clamp(12px, 3vw, 14px)",
          fontWeight: 600,
          color: scenario === "in_class" ? "var(--primary)" : "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "0 0 4px 0",
          fontSize: "clamp(18px, 4.5vw, 24px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {modalityLabel}
      </p>
      <p
        style={{
          margin: "0 0 clamp(12px, 3vw, 16px) 0",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--text-secondary)",
        }}
      >
        {lesson.startTime}–{lesson.endTime}
      </p>
      {summary && (
        <p
          style={{
            margin: "0 0 clamp(16px, 4vw, 20px) 0",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {summary}
        </p>
      )}
      <Link
        href={`/coach/aula?lesson=${lesson.id}`}
        className="btn btn-primary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          fontSize: "clamp(15px, 3.8vw, 17px)",
          padding: "clamp(12px, 3vw, 16px) clamp(20px, 5vw, 24px)",
        }}
      >
        <span aria-hidden>🚀</span>
        {manageLabel}
      </Link>
    </section>
  );
}
