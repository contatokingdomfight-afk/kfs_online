"use client";

import { useState, useEffect } from "react";
import { SCHOOL_GOOGLE_REVIEWS_URL } from "@/lib/school-contact";

type Testimonial = { quote: string; name: string };

type Content = {
  testimonialsTitle: string;
  testimonials: readonly Testimonial[];
  testimonialsGoogleCta: string;
};

export function Testimonials({ content }: { content: Content }) {
  const items = content.testimonials;
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => (a + 1) % items.length);
    }, 5000);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.testimonialsTitle}
        </h2>
        <div className="relative mt-12 overflow-hidden">
          {items.map((item, i) => (
            <div
              key={i}
              className={`transition-all duration-500 ${
                i === active
                  ? "relative opacity-100"
                  : "absolute inset-0 opacity-0 pointer-events-none"
              }`}
            >
              <blockquote className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-center">
                <p className="text-lg italic text-[var(--text-primary)]">
                  &quot;{item.quote}&quot;
                </p>
                <footer className="mt-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/20 font-bold text-[var(--primary)]">
                    {item.name.charAt(0)}
                  </div>
                  <cite className="mt-2 block text-sm not-italic text-[var(--text-secondary)]">
                    {item.name}
                  </cite>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Depoimento ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all ${
                i === active
                  ? "w-6 bg-[var(--primary)]"
                  : "w-2 bg-[var(--border)] hover:bg-[var(--text-secondary)]"
              }`}
            />
          ))}
        </div>
        <p className="mt-6 text-center">
          <a
            href={SCHOOL_GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            {content.testimonialsGoogleCta}
          </a>
        </p>
      </div>
    </section>
  );
}
