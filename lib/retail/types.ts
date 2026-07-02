import type { ProductCategory } from "@/lib/retail/constants";

export type ProductSupplierRow = {
  id: string;
  name: string;
  contact: string | null;
  taxId: string | null;
};

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  salePrice: number;
  supplierId: string | null;
  schoolId: string | null;
  isActive: boolean;
  description: string | null;
};

export type ProductVariantRow = {
  id: string;
  productId: string;
  sku: string;
  size: string | null;
  color: string | null;
  priceOverride: number | null;
  isActive: boolean;
};

export type VariantWithProduct = ProductVariantRow & {
  productName: string;
  productSku: string;
  category: ProductCategory;
  baseSalePrice: number;
  effectivePrice: number;
};

export type InventoryBalanceRow = {
  id: string;
  variantId: string;
  schoolId: string;
  quantityOnHand: number;
  reorderLevel: number;
};

export type LowStockItem = VariantWithProduct & {
  schoolId: string;
  schoolName: string;
  quantityOnHand: number;
  reorderLevel: number;
};

export type StockMovementRow = {
  id: string;
  variantId: string;
  schoolId: string;
  movementType: string;
  quantity: number;
  unitCost: number | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  variantSku?: string;
  productName?: string;
  schoolName?: string;
};

export type RetailSaleRow = {
  id: string;
  schoolId: string;
  soldAt: string;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  studentId: string | null;
  registeredByUserId: string | null;
  notes: string | null;
};

export type RetailSaleLineRow = {
  id: string;
  saleId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type RetailSaleDetail = RetailSaleRow & {
  schoolName: string;
  studentName: string | null;
  registeredByName: string | null;
  lines: Array<RetailSaleLineRow & { productName: string; variantLabel: string }>;
};
