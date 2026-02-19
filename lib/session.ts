import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

// ✅ New secure cookie (signed)
const COOKIE_NAME = "bs_session";

// ✅ Legacy cookie (plain JSON url-encoded) - currently set by your login route
const LEGACY_COOKIE_NAME = "session_user";

const SECRET = process.env.SESSION_SECRET || "dev_secret_change_me";

export type SessionPayload = {
  userId: string;
  role: string;
  distributorId?: string | null;
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

// ✅ Writes signed cookie (recommended)
export async function writeSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSigned(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

// -------------------------
// Reading helpers
// -------------------------

async function readSignedSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [b64, sig] = raw.split(".");
  if (!b64 || !sig) return null;
  if (sign(b64) !== sig) return null;

  try {
    const json = Buffer.from(b64, "base64url").toString();
    const parsed = JSON.parse(json);

    const userId = parsed?.userId;
    const role = parsed?.role;
    const distributorId = parsed?.distributorId ?? null;

    if (!userId || !role) return null;

    return {
      userId: String(userId),
      role: String(role),
      distributorId: distributorId ? String(distributorId) : null,
    };
  } catch {
    return null;
  }
}

// ✅ Reads legacy cookie: session_user=<urlencoded JSON>
async function readLegacySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LEGACY_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);

    const userId = parsed?.userId || parsed?.id;
    const role = parsed?.role;
    const distributorId = parsed?.distributorId ?? null;

    if (!userId || !role) return null;

    return {
      userId: String(userId),
      role: String(role),
      distributorId: distributorId ? String(distributorId) : null,
    };
  } catch {
    return null;
  }
}

/**
 * ✅ Main reader:
 * 1) Try signed cookie (bs_session)
 * 2) fallback to legacy cookie (session_user)
 *    + ✅ migrate legacy → signed cookie
 */
export async function readSession(): Promise<SessionPayload | null> {
  const signed = await readSignedSession();
  if (signed) return signed;

  const legacy = await readLegacySession();
  if (!legacy) return null;

  // ✅ migrate to signed cookie (so everything becomes consistent)
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSigned(legacy), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return legacy;
}

export async function getSessionUser(): Promise<{
  id: string;
  role: string;
  distributorId?: string | null;
} | null> {
  const s = await readSession();
  if (!s?.userId || !s?.role) return null;

  return {
    id: s.userId,
    role: s.role,
    distributorId: s.distributorId ?? null,
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
 * ✅ Generic role guard (utility)
 * - If allowedRoles is omitted/empty => only checks login
 * - Returns {ok:false,...} instead of throwing (API routes friendly)
 */
type RoleAuthOk = {
  ok: true;
  userId: string;
  role: string;
  distributorId?: string | null;
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
  };
}

/**
 * ✅ Warehouse guard (fix for your TS error)
 * Now it ACCEPTS optional roles, so:
 *   requireWarehouse(["WAREHOUSE_MANAGER","ADMIN"])
 * works perfectly.
 *
 * If you call requireWarehouse() without args,
 * it defaults to ["WAREHOUSE_MANAGER","ADMIN"].
 */
export async function requireWarehouse(
  allowedRoles: string[] = ["WAREHOUSE_MANAGER", "ADMIN"]
): Promise<RoleAuthOk | RoleAuthFail> {
  return requireRole(allowedRoles);
}

// ✅ Clear both cookies (new + legacy)
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(LEGACY_COOKIE_NAME);
}