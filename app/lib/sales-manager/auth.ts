import "server-only";
import { getSessionUser } from "@/lib/session";

export async function requireSalesManager(roles: string[] = ["SALES_MANAGER", "ADMIN"]) {
  try {
    const u: any = await getSessionUser(); // expected: { userId/id, role, ... }
    const role = String(u?.role || "");
    const userId = String(u?.userId || u?.id || "");

    if (!userId) return { ok: false, status: 401, error: "UNAUTHORIZED" };
    if (!roles.includes(role)) return { ok: false, status: 403, error: "FORBIDDEN" };

    return { ok: true, status: 200, userId, role };
  } catch (e: any) {
    return { ok: false, status: 401, error: String(e?.message || "UNAUTHORIZED") };
  }
}