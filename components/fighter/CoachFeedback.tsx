"use client";

type Props = {
  quote: string;
  coachName?: string;
};

export function CoachFeedback({ quote, coachName = "Teu treinador" }: Props) {
  return (
    <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
      <h2 className="text-base font-bold text-text-primary mb-3 flex items-center gap-2">
        <span aria-hidden>💬</span>
        Feedback do treinador
      </h2>
      <blockquote className="relative pl-4 border-l-4 border-primary/60 py-1">
        <p className="text-sm text-text-primary leading-relaxed">{quote}</p>
        <footer className="mt-3 flex items-center gap-2">
          <span
            className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm"
            aria-hidden
          >
            {coachName.charAt(0)}
          </span>
          <cite className="text-xs text-text-secondary not-italic">{coachName}</cite>
        </footer>
      </blockquote>
    </section>
  );
}
