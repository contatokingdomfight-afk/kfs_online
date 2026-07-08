import Link from "next/link";
import type { TodayTrialClass } from "@/lib/today-trial-classes";
import { AcceptTrialButton } from "@/app/admin/experimentais/AcceptTrialButton";
import { ConvertTrialButton } from "@/app/admin/experimentais/ConvertTrialButton";

type Props = {
  trials: TodayTrialClass[];
  modalityLabels: Record<string, string>;
  labels: {
    title: string;
    subtitle: string;
    pendingBadge: string;
    acceptedBadge: string;
    viewAll: string;
    goToLesson: string;
  };
  manageHref: string;
  /** Mostrar aceitar/converter e link para presenças na aula (coach). */
  coachScope?: { lessonIds: Set<string> };
};

function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const s = start.length >= 5 ? start.slice(0, 5) : start;
  const e = end ? (end.length >= 5 ? end.slice(0, 5) : end) : null;
  return e ? `${s}–${e}` : s;
}

export function TodayTrialClassesHighlight({
  trials,
  modalityLabels,
  labels,
  manageHref,
  coachScope,
}: Props) {
  if (trials.length === 0) return null;

  return (
    <section
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        borderLeft: "4px solid var(--primary)",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--bg-secondary)) 0%, var(--bg-secondary) 55%)",
      }}
      aria-label={labels.title}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: "clamp(12px, 3vw, 16px)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(17px, 4.2vw, 20px)",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {labels.title}
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 28,
                height: 28,
                padding: "0 8px",
                borderRadius: 999,
                backgroundColor: "var(--primary)",
                color: "#fff",
                fontSize: "clamp(13px, 3.2vw, 15px)",
                fontWeight: 700,
              }}
            >
              {trials.length}
            </span>
          </div>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "clamp(13px, 3.2vw, 15px)",
              color: "var(--text-secondary)",
              lineHeight: 1.45,
            }}
          >
            {labels.subtitle}
          </p>
        </div>
        <Link
          href={manageHref}
          style={{
            flexShrink: 0,
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 600,
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          {labels.viewAll} →
        </Link>
      </div>

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
        {trials.map((trial) => {
          const modLabel = modalityLabels[trial.modality] ?? trial.modality;
          const timeRange = formatTimeRange(trial.startTime, trial.endTime);
          const isPending = !trial.acceptedAt;

          return (
            <li
              key={trial.id}
              style={{
                padding: "clamp(12px, 3vw, 14px)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {timeRange ? (
                  <span
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "clamp(13px, 3.2vw, 15px)",
                      fontWeight: 700,
                      color: "var(--primary)",
                      flexShrink: 0,
                    }}
                  >
                    {timeRange}
                  </span>
                ) : null}
                <span
                  style={{
                    fontSize: "clamp(15px, 3.8vw, 17px)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {trial.name}
                </span>
                <span
                  style={{
                    fontSize: "clamp(12px, 3vw, 13px)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isPending ? "var(--warning)" : "var(--info, #0ea5e9)",
                    color: isPending ? "var(--text-primary)" : "#fff",
                    fontWeight: 600,
                  }}
                >
                  {isPending ? labels.pendingBadge : labels.acceptedBadge}
                </span>
              </div>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "clamp(13px, 3.2vw, 15px)",
                  color: "var(--text-secondary)",
                }}
              >
                {modLabel}
                {trial.contact ? ` · ${trial.contact}` : ""}
              </p>
              <div
                style={{
                  marginTop: "clamp(8px, 2vw, 10px)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {coachScope && isPending ? <AcceptTrialButton trialId={trial.id} /> : null}
                {coachScope && trial.contact.includes("@") ? (
                  <ConvertTrialButton trialId={trial.id} />
                ) : null}
                {!coachScope && isPending ? <AcceptTrialButton trialId={trial.id} /> : null}
                {!coachScope && trial.contact.includes("@") ? <ConvertTrialButton trialId={trial.id} /> : null}
                {coachScope && trial.lessonId ? (
                  <Link
                    href={`/coach/aula?lesson=${trial.lessonId}&date=${encodeURIComponent(trial.lessonDate)}`}
                    style={{
                      fontSize: "clamp(13px, 3.2vw, 15px)",
                      color: "var(--primary)",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {labels.goToLesson} →
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
