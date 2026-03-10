export function isoDate(d: Date) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function startOfMonthLocal(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addDaysLocal(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function startOfYearLocal(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

export function startOfFYLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const fyYear = m >= 4 ? y : y - 1;
  return new Date(fyYear, 3, 1);
}

export function money(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function fmtDateTime(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
}

export function dtShort(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}

export function getRetailerId(r: any): string {
  return String(r?.retailerId || r?.id || r?.retailer?.id || "").trim();
}

export function safeArr<T = any>(x: any): T[] {
  return Array.isArray(x) ? x : [];
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function formatINR(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  try {
    return x.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  } catch {
    return `₹${Math.round(x)}`;
  }
}