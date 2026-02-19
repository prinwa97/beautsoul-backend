export function inr(n: any) {
  const x = Number(n || 0);
  try {
    return x.toLocaleString("en-IN");
  } catch {
    return String(x);
  }
}

export function fmtDate(iso: any) {
  const s = String(iso || "");
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 250) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
