"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  StudentOnboardingWizard,
  getOnboardingDone,
  setOnboardingDone,
  clearOnboardingDone,
  type OnboardingStep,
} from "./StudentOnboardingWizard";

type Props = {
  steps: OnboardingStep[];
  labels: {
    next: string;
    back: string;
    skip: string;
    start: string;
  };
  children: React.ReactNode;
};

export function StudentOnboardingGate({ steps, labels, children }: Props) {
  const [showWizard, setShowWizard] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("replayOnboarding") === "1") {
      clearOnboardingDone();
      setShowWizard(true);
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (!getOnboardingDone()) {
      setShowWizard(true);
    }
  }, [mounted, searchParams]);

  const handleComplete = () => {
    setOnboardingDone();
    setShowWizard(false);
  };

  if (!mounted || !showWizard) return <>{children}</>;

  return (
    <>
      {children}
      <StudentOnboardingWizard
        steps={steps}
        onComplete={handleComplete}
        onSkip={handleComplete}
        labels={labels}
      />
    </>
  );
}
