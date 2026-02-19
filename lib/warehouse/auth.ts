import { requireWarehouse as requireWarehouseFromSession } from "@/lib/session";

// ✅ Allow WAREHOUSE_MANAGER by default, and optionally ADMIN (or others)
export async function requireWarehouse(roles: string[] = ["WAREHOUSE_MANAGER", "ADMIN"]) {
  return requireWarehouseFromSession(roles);
}
