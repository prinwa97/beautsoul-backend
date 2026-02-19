export type ExpiryBucket = "EXPIRED" | "CRITICAL" | "WARNING" | "WATCH" | "OK" | "NO_EXPIRY";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysLeft(expiryDate: Date, now = new Date()) {
  const ms = startOfDay(expiryDate).getTime() - startOfDay(now).getTime();
  return Math.ceil(ms / 86400000);
}

export function bucketFromDaysLeft(dl: number): ExpiryBucket {
  if (dl < 0) return "EXPIRED";
  if (dl <= 30) return "CRITICAL";
  if (dl <= 60) return "WARNING";
  if (dl <= 90) return "WATCH";
  return "OK";
}
