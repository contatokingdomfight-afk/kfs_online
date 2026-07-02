import {
  FINANCE_PAYMENT_METHODS,
  FINANCE_PAYMENT_METHOD_LABELS_PT,
  type FinancePaymentMethod,
} from "@/lib/finance-payment-method";

export const PRODUCT_CATEGORIES = ["EQUIPAMENTO", "VESTUARIO", "ACESSORIO", "CONSUMIVEL"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const STOCK_MOVEMENT_TYPES = ["IN", "OUT", "ADJUST"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const PAYMENT_METHODS = FINANCE_PAYMENT_METHODS;
export type RetailPaymentMethod = FinancePaymentMethod;
export const PAYMENT_METHOD_LABELS_PT = FINANCE_PAYMENT_METHOD_LABELS_PT;

export const EXPENSE_CATEGORIES = ["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS_PT: Record<ProductCategory, string> = {
  EQUIPAMENTO: "Equipamento",
  VESTUARIO: "Vestuário",
  ACESSORIO: "Acessório",
  CONSUMIVEL: "Consumível",
};

export const EXPENSE_CATEGORY_LABELS_PT: Record<ExpenseCategory, string> = {
  RENT: "Renda / aluguer",
  UTILITIES: "Utilidades",
  SUPPLIES: "Material / fornecimentos",
  MARKETING: "Marketing",
  OTHER: "Outro",
};
