export type StockLevel = "CRITICAL" | "LOW" | "HEALTHY";

export type Product = {
  id: string;
  name: string;
  size: string;
  photoUrl: string;
  hsn: string;
  gstRate: number;
  reorderLevel: number;
  lowLevel: number;
  pcsPerBox: number;
};

export type StockItem = {
  productId: string;
  availablePcs: number;
};

export type Retailer = {
  id: string;
  name: string;
  code: string;
  city?: string;
  phone?: string;
};

export type OrderStatus = "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED";

export type OrderItem = {
  productId: string;
  qtyPcs: number;
  rate: number;
};

export type RetailerOrder = {
  id: string;
  retailerId: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
};

export type Invoice = {
  id: string;
  retailerId: string;
  orderId: string;
  createdAt: string;
  taxableTotal: number;
  gstTotal: number;
  grandTotal: number;
};

export type LedgerEntryType = "INVOICE" | "PAYMENT" | "ADJUSTMENT";

export type LedgerEntry = {
  id: string;
  retailerId: string;
  date: string;
  type: LedgerEntryType;
  ref?: string;
  debit: number;
  credit: number;
  note?: string;
};
