import "server-only";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";

export async function requireSalesManager(allowed: string[] = ["SALES_MANAGER", "ADMIN"]) {
  const sess = await readSession();
  if (!sess?.userId) return { ok: false, status: 401, error: "Unauthorized" as const };

  const u = await prisma.user.findUnique({
    where: { id: sess.userId },
    select: { id: true, role: true, status: true },
  });

  if (!u) return { ok: false, status: 401, error: "Unauthorized" as const };
  if (String(u.status) !== "ACTIVE") return { ok: false, status: 403, error: "Inactive user" as const };
  if (!allowed.includes(String(u.role))) return { ok: false, status: 403, error: "Forbidden" as const };

  return { ok: true as const, userId: u.id, role: String(u.role) };
}