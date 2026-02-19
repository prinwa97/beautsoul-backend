import { Product, StockItem, Retailer, RetailerOrder, Invoice, LedgerEntry } from "./types";

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "BeautSoul Facewash",
    size: "100ml",
    photoUrl: "https://picsum.photos/seed/facewash/120/120",
    hsn: "3304",
    gstRate: 18,
    reorderLevel: 20,
    lowLevel: 50,
    pcsPerBox: 48,
  },
  {
    id: "p2",
    name: "BeautSoul Sunscreen Gel",
    size: "50g",
    photoUrl: "https://picsum.photos/seed/sunscreen/120/120",
    hsn: "3304",
    gstRate: 18,
    reorderLevel: 15,
    lowLevel: 40,
    pcsPerBox: 36,
  },
];

export const STOCK: StockItem[] = [
  { productId: "p1", availablePcs: 18 },
  { productId: "p2", availablePcs: 55 },
];

export const RETAILERS: Retailer[] = [
  { id: "r1", name: "Shree Medical Store", code: "BSR001", city: "Abohar" },
  { id: "r2", name: "Gupta General Store", code: "BSR002", city: "Fazilka" },
];

export const ORDERS: RetailerOrder[] = [
  {
    id: "o101",
    retailerId: "r1",
    createdAt: new Date().toISOString(),
    status: "PENDING",
    items: [{ productId: "p1", qtyPcs: 6, rate: 90 }],
  },
];

export const INVOICES: Invoice[] = [
  {
    id: "inv1",
    retailerId: "r1",
    orderId: "o101",
    createdAt: new Date().toISOString(),
    taxableTotal: 540,
    gstTotal: 97,
    grandTotal: 637,
  },
];

export const LEDGER: LedgerEntry[] = [
  {
    id: "l1",
    retailerId: "r1",
    date: new Date().toISOString().slice(0,10),
    type: "INVOICE",
    ref: "inv1",
    debit: 637,
    credit: 0,
    note: "Bill generated",
  },
];
