import Link from "next/link";

type Trial = {
  id: string;
  name: string;
  modality: string;
  lessonDate: string;
  startTime?: string;
  endTime?: string;
};

type Props = {
  trials: Trial[];
  modalityLabels: Record<string, string>;
  title: string;
  manageAllLabel: string;
  emptyMessage: string;
  formatDate: (d: string) => string;
};

export function TrialClassesCard({
  trials,
  modalityLabels,
  title,
  manageAllLabel,
  emptyMessage,
  formatDate,
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
      {trials.length === 0 ? (
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
            gap: "clamp(8px, 2vw, 10px)",
          }}
        >
          {trials.slice(0, 5).map((t) => (
            <li
              key={t.id}
              style={{
                padding: "clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg)",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              <span style={{ color: "var(--text-secondary)", marginLeft: 4 }}>
                ({t.startTime && t.endTime ? `${t.startTime}–${t.endTime} ` : ""}
                {modalityLabels[t.modality] ?? t.modality} · {formatDate(t.lessonDate)})
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/coach/experimentais"
        style={{
          display: "inline-block",
          marginTop: "clamp(12px, 3vw, 16px)",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          color: "var(--primary)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        {manageAllLabel} →
      </Link>
    </section>
  );
}
