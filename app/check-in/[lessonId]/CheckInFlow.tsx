"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useMemo, useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitCheckInAction, type CheckInFormState } from "./actions";
import { CheckInSuccessModal } from "./CheckInSuccessModal";
import { QuickWellnessQuestions } from "@/components/QuickWellnessQuestions";

type Labels = {
  title: string;
  intro: string;
  lessonLine: string;
  submit: string;
  skip: string;
  missingOne: string;
  missingMany: string;
  alreadyDone: string;
  redHint: string;
  successTitle: string;
  backDashboard: string;
  thankYou: string;
  confirmedAt: string;
};

function SubmitRow({ labels, answered, wellnessDone }: { labels: Labels; answered: number; wellnessDone: boolean }) {
  const { pending } = useFormStatus();
  const partial = !wellnessDone && answered > 0 && answered < 3;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <button type="submit" className="btn btn-primary" disabled={pending || partial} style={{ minHeight: 50, fontSize: 16, fontWeight: 800 }}>
        {pending ? "…" : labels.submit}
      </button>
      {partial ? (
        <span style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
          {3 - answered === 1 ? labels.missingOne : labels.missingMany.replace("{n}", String(3 - answered))}
        </span>
      ) : null}
      {!wellnessDone && answered < 3 ? (
        <button
          type="submit"
          name="skipWellness"
          value="1"
          disabled={pending}
          style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "underline", cursor: "pointer", minHeight: 44 }}
        >
          {labels.skip}
        </button>
      ) : null}
    </div>
  );
}

type MonthlyLimit = { used: number; limit: number; remaining: number };

type Props = {
  lessonId: string;
  occurrenceDate: string;
  labels: Labels;
  locale: "pt" | "en";
  monthlyLimit?: MonthlyLimit | null;
  /** O aluno já respondeu ao bem-estar desta aula (ex.: na Home). */
  wellnessDone?: boolean;
};

export function CheckInFlow({ lessonId, occurrenceDate, labels, locale, monthlyLimit, wellnessDone = false }: Props) {
  const initial = useMemo(() => null as CheckInFormState, []);
  const [state, formAction] = useActionState(submitCheckInAction, initial);
  const [answered, setAnswered] = useState(0);
  const showSuccessModal = Boolean(state?.checkedInAt);

  return (
    <div className="container-mobile" style={{ paddingTop: "clamp(24px, 6vw, 32px)", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800, color: "var(--text-primary)" }}>{labels.title}</h1>
      <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{labels.lessonLine}</p>

      {monthlyLimit && (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-secondary)", padding: "6px 12px", borderRadius: 999, background: "var(--bg-secondary)", display: "inline-block" }}>
          {locale === "pt"
            ? `${monthlyLimit.used} de ${monthlyLimit.limit} aulas usadas este mês · faltam ${monthlyLimit.remaining}`
            : `${monthlyLimit.used} of ${monthlyLimit.limit} classes used this month · ${monthlyLimit.remaining} left`}
        </p>
      )}

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="occurrenceDate" value={occurrenceDate} />

        {wellnessDone ? (
          <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <CheckCircle2 size={22} color="var(--success)" aria-hidden />
            <span style={{ fontSize: 14, fontWeight: 700 }}>{labels.alreadyDone}</span>
          </div>
        ) : (
          <section style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>{labels.intro}</p>
            <QuickWellnessQuestions locale={locale} onAnsweredChange={setAnswered} />
          </section>
        )}

        {state?.error && <p style={{ color: "var(--danger)", fontSize: 14, margin: 0 }}>{state.error}</p>}

        <SubmitRow labels={labels} answered={answered} wellnessDone={wellnessDone} />
      </form>

      <p style={{ marginTop: 20, fontSize: 12, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.5 }}>{labels.redHint}</p>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
          {labels.backDashboard}
        </Link>
      </div>

      {showSuccessModal && state?.checkedInAt && (
        <CheckInSuccessModal
          checkedInAt={state.checkedInAt}
          locale={locale}
          successTitle={labels.successTitle}
          confirmedAtTemplate={labels.confirmedAt}
          thankYou={labels.thankYou}
          backDashboard={labels.backDashboard}
          postTrainingHref="/dashboard/bem-estar/rpe"
          postTrainingLabel={locale === "pt" ? "Registar RPE e peso pós-treino" : "Log post-training RPE and weight"}
        />
      )}
    </div>
  );
}
