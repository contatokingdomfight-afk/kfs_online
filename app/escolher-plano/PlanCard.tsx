"use client";

import { useRef, useState, useEffect } from "react";
import { useFormState } from "react-dom";
import { PlanSchoolPaymentModal, type PlanSchoolPaymentFees } from "@/components/PlanSchoolPaymentModal";
import { selectPlanPayAtSchool, type SelectPlanPayAtSchoolResult } from "./actions";
import {
  effectiveModalityScope,
  planRequiresPrimaryModality,
} from "@/lib/plan-primary-modality";

type ModalityOption = { code: string; name: string };

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  includes_digital_access: boolean;
  includes_performance_tracking: boolean;
  includes_check_in: boolean;
  modality_scope: string | null;
  includes_exclusive_benefits: boolean;
};

type Props = {
  plan: Plan;
  studentId: string | null;
  locale: "pt" | "en";
  perMonth: string;
  choosePlanSelect: string;
  choosePlanModalityLabel: string;
  modalityOptions: ModalityOption[];
  fees: PlanSchoolPaymentFees;
  modalTitle: string;
  modalBody: string;
  modalConfirm: string;
  modalCancel: string;
  modalTotal: string;
  modalTuition: string;
  modalEnrollment: string;
  modalInsurance: string;
};

export function PlanCard({
  plan,
  studentId,
  locale,
  perMonth,
  choosePlanSelect,
  choosePlanModalityLabel,
  modalityOptions,
  fees,
  modalTitle,
  modalBody,
  modalConfirm,
  modalCancel,
  modalTotal,
  modalTuition,
  modalEnrollment,
  modalInsurance,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(selectPlanPayAtSchool, null as SelectPlanPayAtSchoolResult | null);
  const [primaryModality, setPrimaryModality] = useState(modalityOptions[0]?.code ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEn = locale === "en";
  const modalityScope = effectiveModalityScope(plan.modality_scope, plan.id, plan.name);
  const needsModality = planRequiresPrimaryModality(plan.modality_scope, plan.id, plan.name);

  const cardFees: PlanSchoolPaymentFees = {
    tuition: plan.price_monthly,
    enrollment: fees.enrollment,
    insurance: fees.insurance,
    showEnrollment: fees.showEnrollment,
    showInsurance: fees.showInsurance,
  };

  const benefits: string[] = [];
  if (plan.includes_check_in) benefits.push(isEn ? "Class check-in" : "Check-in nas aulas");
  if (plan.includes_digital_access) benefits.push(isEn ? "Digital library access" : "Acesso à biblioteca digital");
  if (plan.includes_performance_tracking) benefits.push(isEn ? "Performance tracking" : "Acompanhamento de performance");
  if (modalityScope === "ALL") benefits.push(isEn ? "All modalities" : "Todas as modalidades");
  else if (modalityScope === "SINGLE") benefits.push(isEn ? "One modality" : "Uma modalidade");
  if (plan.includes_exclusive_benefits) benefits.push(isEn ? "Exclusive benefits" : "Benefícios exclusivos");

  function confirmPlan() {
    setSubmitting(true);
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    if (state?.error) setSubmitting(false);
  }, [state?.error]);

  const selectedModalityLabel =
    modalityOptions.find((m) => m.code === primaryModality)?.name ?? primaryModality;

  return (
    <>
      <PlanSchoolPaymentModal
        open={modalOpen}
        mode="confirm"
        onClose={() => !submitting && setModalOpen(false)}
        onConfirm={confirmPlan}
        planName={plan.name}
        modalityLabel={needsModality ? selectedModalityLabel : null}
        fees={cardFees}
        locale={locale}
        confirming={submitting}
        title={modalTitle}
        body={modalBody}
        confirmLabel={modalConfirm}
        cancelLabel={modalCancel}
        totalLabel={modalTotal}
        tuitionLabel={modalTuition}
        enrollmentLabel={modalEnrollment}
        insuranceLabel={modalInsurance}
      />
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "clamp(20px, 5vw, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          backgroundColor: "var(--bg-secondary, var(--bg))",
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{plan.name}</h3>
        {plan.description && (
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>{plan.description}</p>
        )}
        <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          €{plan.price_monthly.toFixed(0)}
          <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)" }}>{perMonth}</span>
        </p>
        <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          {benefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>

        {studentId ? (
          <form
            ref={formRef}
            action={formAction}
            style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}
          >
            <input type="hidden" name="planId" value={plan.id} />
            {needsModality && modalityOptions.length > 0 && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                <span style={{ fontWeight: 500 }}>{choosePlanModalityLabel}</span>
                <select
                  name="primaryModality"
                  value={primaryModality}
                  onChange={(e) => setPrimaryModality(e.target.value)}
                  className="input"
                  required
                >
                  {modalityOptions.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {state?.error && (
              <p style={{ fontSize: 13, color: "var(--danger, #dc2626)", margin: 0 }} role="alert">
                {state.error}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={() => setModalOpen(true)}
            >
              {submitting ? (isEn ? "Saving…" : "A registar…") : choosePlanSelect}
            </button>
          </form>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            {isEn ? "Sign in to choose a plan." : "Inicia sessão para escolher um plano."}
          </p>
        )}
      </div>
    </>
  );
}
