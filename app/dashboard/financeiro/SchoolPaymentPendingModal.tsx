"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlanSchoolPaymentModal, type PlanSchoolPaymentFees } from "@/components/PlanSchoolPaymentModal";

type Props = {
  showGate: boolean;
  planName: string;
  fees: PlanSchoolPaymentFees;
  locale: "pt" | "en";
  title: string;
  body: string;
  dismissLabel: string;
  totalLabel: string;
  tuitionLabel: string;
  enrollmentLabel: string;
  insuranceLabel: string;
};

/** Aviso na área financeira até a secretaria confirmar o pagamento. */
export function SchoolPaymentPendingModal({
  showGate,
  planName,
  fees,
  locale,
  title,
  body,
  dismissLabel,
  totalLabel,
  tuitionLabel,
  enrollmentLabel,
  insuranceLabel,
}: Props) {
  const searchParams = useSearchParams();
  const forceOpen =
    searchParams.get("pagamento_escola") === "1" || searchParams.get("inscricao") === "1";
  const [dismissed, setDismissed] = useState(false);

  if (!showGate) return null;
  if (dismissed && !forceOpen) return null;

  return (
    <PlanSchoolPaymentModal
      open
      mode="info"
      onClose={() => setDismissed(true)}
      onConfirm={() => setDismissed(true)}
      planName={planName}
      fees={fees}
      locale={locale}
      title={title}
      body={body}
      confirmLabel={dismissLabel}
      totalLabel={totalLabel}
      tuitionLabel={tuitionLabel}
      enrollmentLabel={enrollmentLabel}
      insuranceLabel={insuranceLabel}
    />
  );
}
