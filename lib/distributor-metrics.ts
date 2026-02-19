import { INVOICES, LEDGER, ORDERS, PRODUCTS, STOCK } from "./distributor-data";
import { StockLevel } from "./types";

export const money = (n: number) => "₹" + n.toLocaleString("en-IN");

export function getStockLevel(productId: string): StockLevel {
  const p = PRODUCTS.find(x => x.id === productId);
  const s = STOCK.find(x => x.productId === productId);
  if (!p || !s) return "HEALTHY";
  if (s.availablePcs <= p.reorderLevel) return "CRITICAL";
  if (s.availablePcs <= p.lowLevel) return "LOW";
  return "HEALTHY";
}

export function countStockByLevel() {
  let critical = 0, low = 0, healthy = 0;
  for (const s of STOCK) {
    const lv = getStockLevel(s.productId);
    if (lv === "CRITICAL") critical++;
    else if (lv === "LOW") low++;
    else healthy++;
  }
  return { critical, low, healthy };
}

export function getDashboardKpis() {
  const today = new Date().toISOString().slice(0,10);
  const todaySales = INVOICES
    .filter(i => i.createdAt.slice(0,10) === today)
    .reduce((s,i)=>s+i.grandTotal,0);

  const todayOrders = ORDERS.filter(o => o.createdAt.slice(0,10) === today).length;

  const outstanding = LEDGER.reduce((s,e)=>s + e.debit - e.credit, 0);

  return { todaySales, todayOrders, outstanding };
}
