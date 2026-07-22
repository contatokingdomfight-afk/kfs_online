export type PaymentListRow = {
  id: string;
  studentId: string;
  displayName: string;
  status: string;
  referenceMonth: string | null;
  referenceYear: string | null;
  paymentType: string;
  amount: number;
  paymentMethod?: string | null;
  familyGroupId?: string | null;
  familyMemberCount?: number | null;
};

export type OnboardingBundleRow = {
  kind: "onboarding_bundle";
  id: string;
  studentId: string;
  displayName: string;
  status: "LATE" | "PAID";
  amount: number;
  paymentIds: string[];
  referenceMonth: string | null;
};

export type PaymentListDisplayRow = PaymentListRow | OnboardingBundleRow;

function isOnboardingType(paymentType: string): boolean {
  return paymentType === "TUITION" || paymentType === "ENROLLMENT" || paymentType === "INSURANCE";
}

function hasPaidTuition(rows: PaymentListRow[]): boolean {
  return rows.some((r) => r.status === "PAID" && r.paymentType === "TUITION");
}

/** Primeiro pagamento: só uma mensalidade PAID no histórico visível. */
function isSinglePaidTuitionFirstPayment(rows: PaymentListRow[]): boolean {
  const paidTuition = rows.filter((r) => r.status === "PAID" && r.paymentType === "TUITION");
  return paidTuition.length === 1;
}

function buildOnboardingBundle(
  studentId: string,
  studentRows: PaymentListRow[],
  items: PaymentListRow[],
  status: "LATE" | "PAID"
): OnboardingBundleRow | null {
  if (items.length < 2) return null;
  const hasTuition = items.some((r) => r.paymentType === "TUITION");
  const hasExtra = items.some(
    (r) => r.paymentType === "ENROLLMENT" || r.paymentType === "INSURANCE"
  );
  if (!hasTuition || !hasExtra) return null;

  const tuitionMonth =
    items.find((r) => r.paymentType === "TUITION")?.referenceMonth ?? null;

  return {
    kind: "onboarding_bundle",
    id: `onboarding:${studentId}:${status}`,
    studentId,
    displayName: studentRows[0]?.displayName ?? "—",
    status,
    amount: items.reduce((sum, r) => sum + r.amount, 0),
    paymentIds: items.map((r) => r.id),
    referenceMonth: tuitionMonth,
  };
}

/**
 * Agrupa 1.º pagamento (matrícula + seguro + mensalidade) numa linha — pendente ou já pago.
 */
export function groupPaymentListRows(rows: PaymentListRow[]): PaymentListDisplayRow[] {
  const byStudent = new Map<string, PaymentListRow[]>();
  for (const row of rows) {
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row);
    byStudent.set(row.studentId, list);
  }

  const consumedIds = new Set<string>();
  const bundles: OnboardingBundleRow[] = [];

  for (const [studentId, studentRows] of byStudent) {
    let bundle: OnboardingBundleRow | null = null;

    if (!hasPaidTuition(studentRows)) {
      const lateOnboarding = studentRows.filter(
        (r) => r.status === "LATE" && isOnboardingType(r.paymentType)
      );
      bundle = buildOnboardingBundle(studentId, studentRows, lateOnboarding, "LATE");
    } else if (isSinglePaidTuitionFirstPayment(studentRows)) {
      const lateOnboarding = studentRows.filter(
        (r) => r.status === "LATE" && isOnboardingType(r.paymentType)
      );
      if (lateOnboarding.length === 0) {
        const paidOnboarding = studentRows.filter(
          (r) => r.status === "PAID" && isOnboardingType(r.paymentType)
        );
        bundle = buildOnboardingBundle(studentId, studentRows, paidOnboarding, "PAID");
      }
    }

    if (bundle) {
      bundles.push(bundle);
      for (const id of bundle.paymentIds) consumedIds.add(id);
    }
  }

  const rest = rows.filter((r) => !consumedIds.has(r.id));
  return [...bundles, ...rest];
}

export function isOnboardingBundleRow(row: PaymentListDisplayRow): row is OnboardingBundleRow {
  return "kind" in row && row.kind === "onboarding_bundle";
}

/** Agrupa pagamentos LATE para o painel «Pagamentos pendentes» do admin. */
export function groupPendingPaymentRows(
  rows: PaymentListRow[]
): Array<{
  id: string;
  studentId: string;
  displayName: string;
  amount: number;
  referenceMonth: string;
  isOnboardingBundle: boolean;
}> {
  const grouped = groupPaymentListRows(rows);
  const out: Array<{
    id: string;
    studentId: string;
    displayName: string;
    amount: number;
    referenceMonth: string;
    isOnboardingBundle: boolean;
  }> = [];

  for (const row of grouped) {
    if (isOnboardingBundleRow(row)) {
      if (row.status !== "LATE") continue;
      out.push({
        id: row.id,
        studentId: row.studentId,
        displayName: row.displayName,
        amount: row.amount,
        referenceMonth: row.referenceMonth ?? "",
        isOnboardingBundle: true,
      });
      continue;
    }
    if (row.status !== "LATE") continue;
    out.push({
      id: row.id,
      studentId: row.studentId,
      displayName: row.displayName,
      amount: row.amount,
      referenceMonth: row.referenceMonth ?? "",
      isOnboardingBundle: false,
    });
  }

  return out;
}
