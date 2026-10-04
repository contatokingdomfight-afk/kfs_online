"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { MessageSquareHeart } from "lucide-react";
import { submitCoachTestimonial, type SubmitCoachTestimonialResult } from "./coach-testimonial-actions";

type Props = {
  coachId: string;
  coachName: string;
  existing: { rating: number; body: string; status: "PENDING" | "APPROVED" | "REJECTED" } | null;
  locale: "pt" | "en";
};

const STATUS_LABEL_PT: Record<string, string> = {
  PENDING: "Em análise",
  APPROVED: "Publicado",
  REJECTED: "Não publicado",
};
const STATUS_LABEL_EN: Record<string, string> = {
  PENDING: "Under review",
  APPROVED: "Published",
  REJECTED: "Not published",
};

export function CoachTestimonialSection({ coachId, coachName, existing, locale }: Props) {
  const L = locale === "pt";
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [state, formAction] = useFormState(submitCoachTestimonial, null as SubmitCoachTestimonialResult | null);

  const statusLabel = existing ? (L ? STATUS_LABEL_PT[existing.status] : STATUS_LABEL_EN[existing.status]) : null;

  return (
    <section
      className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md"
      style={{ marginTop: "clamp(20px, 5vw, 24px)" }}
    >
      <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
        <MessageSquareHeart size={16} aria-hidden />
        {L ? "O teu treinador" : "Your coach"}
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        {L
          ? `Deixa um depoimento sobre ${coachName}. Fica visível no perfil público dele depois de aprovado pela escola.`
          : `Leave a testimonial about ${coachName}. It appears on their public profile once approved by the school.`}
      </p>

      {statusLabel ? (
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--primary)" }}>
          {L ? "Estado" : "Status"}: {statusLabel}
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="coachId" value={coachId} />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} ${L ? "estrelas" : "stars"}`}
              onClick={() => setRating(n)}
              style={{ fontSize: 24, lineHeight: 1, color: n <= rating ? "var(--primary)" : "var(--border)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ★
            </button>
          ))}
          <input type="hidden" name="rating" value={rating} />
        </div>
        <textarea
          name="body"
          defaultValue={existing?.body ?? ""}
          className="input"
          rows={3}
          maxLength={1000}
          placeholder={L ? "O que o teu treinador significa para o teu percurso?" : "What does your coach mean for your journey?"}
        />
        {state?.error ? <p className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</p> : null}
        {state?.success ? (
          <p className="text-sm" style={{ color: "var(--success)" }}>
            {L ? "Depoimento enviado para análise." : "Testimonial sent for review."}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          {existing ? (L ? "Atualizar depoimento" : "Update testimonial") : L ? "Enviar depoimento" : "Submit testimonial"}
        </button>
      </form>
    </section>
  );
}
