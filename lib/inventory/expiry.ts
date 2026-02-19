/**
 * Inventory expiry helpers
 * Used by:
 * - /api/warehouse/inventory/expiry
 * - /api/warehouse/inventory/expiry/summary
 */

export function daysLeft(expiryDate: Date | string | null | undefined): number {
  if (!expiryDate) return 0;
  const d = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  if (!(d instanceof Date) || isNaN(d.getTime())) return 0;

  // Normalize to start-of-day
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  const diffMs = x.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// buckets for UI (feel free to adjust)
export type ExpiryBucket = "EXPIRED" | "0_7" | "8_15" | "16_30" | "31_60" | "60+";

export function bucketFromDaysLeft(dl: number): ExpiryBucket {
  if (dl < 0) return "EXPIRED";
  if (dl <= 7) return "0_7";
  if (dl <= 15) return "8_15";
  if (dl <= 30) return "16_30";
  if (dl <= 60) return "31_60";
  return "60+";
}
