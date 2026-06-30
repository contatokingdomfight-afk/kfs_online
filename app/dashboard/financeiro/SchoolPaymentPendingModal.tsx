"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlanSchoolPaymentModal, type PlanSchoolPaymentFees } from "@/components/PlanSchoolPaymentModal";

const SCHOOL_PAYMENT_ACK_KEY = "kfs_school_payment_ack";

function hasAcknowledgedSchoolPayment(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SCHOOL_PAYMENT_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const showFromQuery =
    searchParams.get("pagamento_escola") === "1" || searchParams.get("inscricao") === "1";
  const [dismissed, setDismissed] = useState(hasAcknowledgedSchoolPayment);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SCHOOL_PAYMENT_ACK_KEY, "1");
    } catch {
      /* ignore */
    }
    router.replace("/dashboard");
  }, [router]);

  if (!showGate) return null;
  if (dismissed || hasAcknowledgedSchoolPayment()) return null;
  if (!showFromQuery) return null;

  return (
    <PlanSchoolPaymentModal
      open
      mode="info"
      onClose={handleDismiss}
      onConfirm={handleDismiss}
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
