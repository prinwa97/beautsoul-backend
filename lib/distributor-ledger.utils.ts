export function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}
export function toMoney(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}
export function formatINR(n: any) {
  const x = toMoney(n);
  try { return x.toLocaleString("en-IN"); } catch { return String(x); }
}
export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
