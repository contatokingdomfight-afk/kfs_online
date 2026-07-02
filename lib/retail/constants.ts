export const PRODUCT_CATEGORIES = ["EQUIPAMENTO", "VESTUARIO", "ACESSORIO", "CONSUMIVEL"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const STOCK_MOVEMENT_TYPES = ["IN", "OUT", "ADJUST"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "MB", "OTHER"] as const;
export type RetailPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORIES = ["RENT", "UTILITIES", "SUPPLIES", "MARKETING", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS_PT: Record<ProductCategory, string> = {
  EQUIPAMENTO: "Equipamento",
  VESTUARIO: "Vestuário",
  ACESSORIO: "Acessório",
  CONSUMIVEL: "Consumível",
};

export const PAYMENT_METHOD_LABELS_PT: Record<RetailPaymentMethod, string> = {
  CASH: "Dinheiro",
  CARD: "Cartão",
  MB: "Multibanco",
  OTHER: "Outro",
};

export const EXPENSE_CATEGORY_LABELS_PT: Record<ExpenseCategory, string> = {
  RENT: "Renda / aluguer",
  UTILITIES: "Utilidades",
  SUPPLIES: "Material / fornecimentos",
  MARKETING: "Marketing",
  OTHER: "Outro",
};
