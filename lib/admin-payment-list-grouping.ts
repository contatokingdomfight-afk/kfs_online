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
  /**
   * Linha derivada (não é um Payment real): membro do plano família cuja mensalidade
   * está associada à combinada do titular. Renderiza a 0€. Se `status === "LATE"`,
   * mostra-se em «Em atraso» e pode ser registada individualmente (ex.: o titular
   * pagou só a parte deste membro); se o titular já pagou (`status === "COVERED"`),
   * fica apenas informativa («Coberto»), sem ações.
   */
  familyMemberDerived?: boolean;
  /** Valor mensal sugerido (parte do membro já com desconto de família) para pré-preencher o registo. */
  suggestedShare?: number;
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
