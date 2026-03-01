// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/lib/session.ts
import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

// ✅ Single source of truth cookie (signed)
const COOKIE_NAME = "bs_session";

// ✅ MUST be set in production (never keep dev default in prod)
const SECRET = process.env.SESSION_SECRET || "dev_secret_change_me";

export type SessionPayload = {
  userId: string;
  role: string;
  distributorId?: string | null;
  retailerId?: string | null;
};

function sign(data: string) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

function encodeSigned(payload: SessionPayload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

async function readSignedSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [b64, sig] = raw.split(".");
  if (!b64 || !sig) return null;

  // signature verify
  if (sign(b64) !== sig) return null;

  try {
    const json = Buffer.from(b64, "base64url").toString();
    const parsed = JSON.parse(json);

    const userId = parsed?.userId;
    const role = parsed?.role;

    const distributorId = parsed?.distributorId ?? null;
    const retailerId = parsed?.retailerId ?? null;

    if (!userId || !role) return null;

    return {
      userId: String(userId),
      role: String(role),
      distributorId: distributorId ? String(distributorId) : null,
      retailerId: retailerId ? String(retailerId) : null,
    };
  } catch {
    return null;
  }
}

/**
 * ✅ Read session (SIGNED ONLY)
 */
export async function readSession(): Promise<SessionPayload | null> {
  return await readSignedSession();
}

/**
 * ✅ Write signed session cookie
 */
export async function writeSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSigned(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSessionUser(): Promise<{
  id: string;
  role: string;
  distributorId?: string | null;
  retailerId?: string | null;
} | null> {
  const s = await readSession();
  if (!s?.userId || !s?.role) return null;

  return {
    id: s.userId,
    role: s.role,
    distributorId: s.distributorId ?? null,
    retailerId: s.retailerId ?? null,
  };
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("Unauthorized (no session).");
  return u;
}

export async function requireDistributorId() {
  const u = await requireUser();
  const distributorId = u.distributorId ?? null;
  if (!distributorId) throw new Error("DistributorId missing (login/session issue).");
  return distributorId;
}

/**
 * ✅ Generic role guard (API routes friendly)
 */
type RoleAuthOk = {
  ok: true;
  userId: string;
  role: string;
  distributorId?: string | null;
  retailerId?: string | null;
};
type RoleAuthFail = { ok: false; error: string; status: number };

export async function requireRole(allowedRoles?: string[]): Promise<RoleAuthOk | RoleAuthFail> {
  const u = await getSessionUser();
  if (!u?.id) return { ok: false, error: "UNAUTHORIZED", status: 401 };

  const role = String(u.role || "");
  if (allowedRoles?.length) {
    if (!allowedRoles.includes(role)) {
      return { ok: false, error: "FORBIDDEN", status: 403 };
    }
  }

  return {
    ok: true,
    userId: u.id,
    role,
    distributorId: u.distributorId ?? null,
    retailerId: u.retailerId ?? null,
  };
}

/**
 * ✅ Warehouse guard
 * - Works with: requireWarehouse(["WAREHOUSE_MANAGER","ADMIN"])
 * - Defaults to ["WAREHOUSE_MANAGER","ADMIN"]
 */
export async function requireWarehouse(
  allowedRoles: string[] = ["WAREHOUSE_MANAGER", "ADMIN"]
): Promise<RoleAuthOk | RoleAuthFail> {
  return requireRole(allowedRoles);
}

/**
 * ✅ Clear session cookie
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}