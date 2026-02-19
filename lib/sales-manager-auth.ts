import { getSessionUser } from "@/lib/session";

type SessionUser = {
  id: string;
  role: string;
  salesManagerId?: string | null;
  distributorId?: string | null;
  fieldOfficerId?: string | null;
  retailerId?: string | null;
};

export async function requireRole(allowed: string[]) {
  const u = await getSessionUser();

  if (!u || !u.role || !allowed.includes(String(u.role))) {
    return { ok: false, error: "Unauthorized", status: 401 as const };
  }

  return { ok: true, user: u as SessionUser };
}
