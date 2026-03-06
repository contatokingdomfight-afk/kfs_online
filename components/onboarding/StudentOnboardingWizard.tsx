"use client";

import { useState } from "react";

const STORAGE_KEY = "kfs-student-onboarding-done";

export type OnboardingStep = {
  title: string;
  description: string;
};

type Props = {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip: () => void;
  labels: {
    next: string;
    back: string;
    skip: string;
    start: string;
  };
};

export function StudentOnboardingWizard({ steps, onComplete, onSkip, labels }: Props) {
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const current = steps[step];

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-desc"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              {step + 1} / {steps.length}
            </p>
            <h2 id="onboarding-title" className="text-xl sm:text-2xl font-bold text-text-primary mb-3">
              {current.title}
            </h2>
            <p id="onboarding-desc" className="text-sm sm:text-base text-text-secondary leading-relaxed">
              {current.description}
            </p>
          </div>

          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={i === step ? "Passo atual" : `Passo ${i + 1}`}
                className="flex-1 h-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor: i === step ? "var(--primary)" : "var(--border)",
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-text-primary hover:bg-bg hover:border-primary/50 transition-colors"
                >
                  {labels.back}
                </button>
              )}
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {labels.skip}
              </button>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isLast ? labels.start : labels.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getOnboardingDone(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setOnboardingDone(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "1");
}

export function clearOnboardingDone(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
