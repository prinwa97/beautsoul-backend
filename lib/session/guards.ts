import { getSessionUser } from "@/lib/session";

/**
 * Generic role guard used by a few distributor routes.
 * Usage: await requireRole(["DISTRIBUTOR"])
 */
export async function requireRole(roles: string[] | string) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const u: any = await getSessionUser();

  // Expecting session user shape like: { id, role, ... }
  const role = String(u?.role || "");
  if (!u?.id || !allowed.includes(role)) {
    const err: any = new Error("FORBIDDEN");
    err.status = 403;
    throw err;
  }
  return u;
}
