"use client";

import { useState } from "react";

type FAQItem = { q: string; a: string };

type Content = {
  faqTitle: string;
  faqItems: readonly FAQItem[];
};

export function FAQSection({ content }: { content: Content }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.faqTitle}
        </h2>
        <div className="mt-10 flex flex-col gap-3">
          {content.faqItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] transition-colors hover:border-[var(--primary)]/30"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-[var(--text-primary)]">{item.q}</span>
                  <span
                    aria-hidden
                    className={`shrink-0 text-[var(--primary)] transition-transform ${isOpen ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
