import Link from "next/link";
import { formatNextLessonDate } from "@/lib/lesson-utils";

export type CoachPendingPhysicalRequestRow = {
  id: string;
  createdAt: string;
  note: string | null;
  studentId: string;
  studentName: string | null;
};

type Props = {
  rows: CoachPendingPhysicalRequestRow[];
  title: string;
  emptyMessage: string;
  openAssessmentLabel: string;
  unnamedStudentLabel: string;
  locale: "pt" | "en";
};

export function PhysicalAssessmentRequestsCoachCard({
  rows,
  title,
  emptyMessage,
  openAssessmentLabel,
  unnamedStudentLabel,
  locale,
}: Props) {
  return (
    <section
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        marginBottom: "clamp(12px, 3vw, 16px)",
      }}
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
      {rows.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
          }}
        >
          {emptyMessage}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 2.5vw, 12px)",
          }}
        >
          {rows.map((r) => {
            const day = r.createdAt.slice(0, 10);
            const displayName = (r.studentName?.trim() || unnamedStudentLabel) as string;
            return (
              <li
                key={r.id}
                style={{
                  padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 14px)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
                  <span style={{ fontWeight: 600 }}>{displayName}</span>
                  <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>
                    · {formatNextLessonDate(day, locale)}
                  </span>
                </div>
                {r.note ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "clamp(13px, 3.2vw, 14px)",
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {r.note}
                  </p>
                ) : null}
                <Link
                  href={`/coach/alunos/${r.studentId}/avaliacao-fisica`}
                  className="btn btn-primary no-underline"
                  style={{ alignSelf: "flex-start", fontSize: "clamp(13px, 3.2vw, 14px)", padding: "8px 14px" }}
                >
                  {openAssessmentLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
