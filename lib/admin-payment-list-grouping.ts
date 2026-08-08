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
  /** % de desconto do grupo família, quando esta linha é a mensalidade combinada do titular. */
  familyDiscountPercent?: number | null;
};

/** Rótulo em PT do tipo de pagamento, para listas de pendentes/registos. */
export function paymentTypeLabelPt(paymentType: string): string {
  if (paymentType === "INSURANCE") return "Seguro";
  if (paymentType === "ENROLLMENT") return "Matrícula";
  return "Mensalidade";
}

/** Filtra só os registos «Em atraso» — cada tipo (mensalidade/matrícula/seguro) fica como item próprio. */
export function groupPendingPaymentRows(rows: PaymentListRow[]): PaymentListRow[] {
  return rows.filter((r) => r.status === "LATE");
}
