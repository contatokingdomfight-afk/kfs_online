import Link from "next/link";

type Lesson = {
  id: string;
  modality: string;
  startTime: string;
  endTime: string;
};

type Props = {
  lessons: Lesson[];
  modalityLabels: Record<string, string>;
  title: string;
  viewAgendaLabel: string;
  noLessonsLabel: string;
};

export function TodayScheduleCard({
  lessons,
  modalityLabels,
  title,
  viewAgendaLabel,
  noLessonsLabel,
}: Props) {
  return (
    <section
      className="card"
      style={{ padding: "clamp(16px, 4vw, 20px)" }}
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
      {lessons.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
          }}
        >
          {noLessonsLabel}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(8px, 2vw, 10px)",
          }}
        >
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/coach/aula?lesson=${l.id}`}
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
                <span style={{ fontWeight: 600 }}>
                  {l.startTime} {modalityLabels[l.modality] ?? l.modality}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/coach/agenda"
        style={{
          display: "inline-block",
          marginTop: "clamp(12px, 3vw, 16px)",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--primary)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        {viewAgendaLabel} →
      </Link>
    </section>
  );
}
