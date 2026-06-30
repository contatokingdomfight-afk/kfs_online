export type PaymentListRow = {
  id: string;
  studentId: string;
  displayName: string;
  status: string;
  referenceMonth: string | null;
  referenceYear: string | null;
  paymentType: string;
  amount: number;
};

export type OnboardingBundleRow = {
  kind: "onboarding_bundle";
  id: string;
  studentId: string;
  displayName: string;
  status: "LATE";
  amount: number;
  paymentIds: string[];
  referenceMonth: string | null;
};

export type PaymentListDisplayRow = PaymentListRow | OnboardingBundleRow;

function isOnboardingType(paymentType: string): boolean {
  return paymentType === "TUITION" || paymentType === "ENROLLMENT" || paymentType === "INSURANCE";
}

/**
 * Aluno com inscrição pendente: agrupa LATE de matrícula + seguro + mensalidade numa única linha.
 * Mantém pagamentos PAID e mensalidades avulsas separados.
 */
export function groupPaymentListRows(rows: PaymentListRow[]): PaymentListDisplayRow[] {
  const byStudent = new Map<string, PaymentListRow[]>();
  for (const row of rows) {
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row);
    byStudent.set(row.studentId, list);
  }

  const bundledStudentIds = new Set<string>();
  const bundles: OnboardingBundleRow[] = [];

  for (const [studentId, studentRows] of byStudent) {
    const hasPaid = studentRows.some((r) => r.status === "PAID");
    if (hasPaid) continue;

    const lateOnboarding = studentRows.filter(
      (r) => r.status === "LATE" && isOnboardingType(r.paymentType)
    );
    if (lateOnboarding.length < 2) continue;

    const tuitionLate = lateOnboarding.some((r) => r.paymentType === "TUITION");
    const extraLate = lateOnboarding.some(
      (r) => r.paymentType === "ENROLLMENT" || r.paymentType === "INSURANCE"
    );
    if (!tuitionLate || !extraLate) continue;

    bundledStudentIds.add(studentId);
    const displayName = studentRows[0]?.displayName ?? "—";
    const tuitionMonth =
      lateOnboarding.find((r) => r.paymentType === "TUITION")?.referenceMonth ?? null;

    bundles.push({
      kind: "onboarding_bundle",
      id: `onboarding:${studentId}`,
      studentId,
      displayName,
      status: "LATE",
      amount: lateOnboarding.reduce((sum, r) => sum + r.amount, 0),
      paymentIds: lateOnboarding.map((r) => r.id),
      referenceMonth: tuitionMonth,
    });
  }

  const rest = rows.filter((r) => {
    if (!bundledStudentIds.has(r.studentId)) return true;
    if (r.status !== "LATE" || !isOnboardingType(r.paymentType)) return true;
    return false;
  });

  return [...bundles, ...rest];
}

export function isOnboardingBundleRow(row: PaymentListDisplayRow): row is OnboardingBundleRow {
  return "kind" in row && row.kind === "onboarding_bundle";
}
