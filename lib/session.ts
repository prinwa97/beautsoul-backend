// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/lib/session.ts
import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

// ✅ Single source of truth cookie
const COOKIE_NAME = "bs_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 min

export type SessionPayload = {
  userId: string;
  role: string;
  distributorId?: string | null;
  retailerId?: string | null;
  salesManagerId?: string | null;
  iat?: number;
  exp?: number;
};

type SessionUser = {
  id: string;
  role: string;
  distributorId?: string | null;
  retailerId?: string | null;
  salesManagerId?: string | null;
};

type RoleAuthOk = {
  ok: true;
  userId: string;
  role: string;
  distributorId?: string | null;
  retailerId?: string | null;
  salesManagerId?: string | null;
};

type RoleAuthFail = {
  ok: false;
  error: string;
  status: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();

  // ✅ Production me strict
  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      throw new Error("SESSION_SECRET must be defined in production");
    }
    if (secret.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters in production");
    }
    return secret;
  }

  // ✅ Dev me fallback allow
  return secret || "dev_only_session_secret_change_me_123456";
}

function sign(data: string) {
  const secret = getSessionSecret();
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

function isValidHexSha256(sig: string) {
  return /^[a-f0-9]{64}$/i.test(String(sig || ""));
}

function verifySignature(data: string, providedSig: string) {
  try {
    if (!isValidHexSha256(providedSig)) return false;

    const expectedHex = sign(data);
    const expected = Buffer.from(expectedHex, "hex");
    const provided = Buffer.from(providedSig, "hex");

    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

function cleanNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * Creates signed token:
 * base64url(json_payload).signature
 */
function encodeSigned(payload: SessionPayload) {
  const now = Date.now();

  const normalized: SessionPayload = {
    userId: String(payload.userId).trim(),
    role: String(payload.role).trim().toUpperCase(),
    distributorId: cleanNullableString(payload.distributorId),
    retailerId: cleanNullableString(payload.retailerId),
    salesManagerId: cleanNullableString(payload.salesManagerId),
    iat: now,
    exp: now + SESSION_TTL_MS,
  };

  const body = JSON.stringify(normalized);
  const bodyB64 = Buffer.from(body, "utf8").toString("base64url");

  // ✅ Sign the exact encoded body part used in token
  const signature = sign(bodyB64);
  return `${bodyB64}.${signature}`;
}

/**
 * Verifies signed token and returns payload
 */
function verifySigned(token: string): SessionPayload | null {
  try {
    const raw = String(token || "").trim();
    if (!raw) return null;

    const parts = raw.split(".");
    if (parts.length !== 2) return null;

    const [bodyB64, signature] = parts;
    if (!bodyB64 || !signature) return null;
    if (!verifySignature(bodyB64, signature)) return null;

    const body = Buffer.from(bodyB64, "base64url").toString("utf8");
    if (!body) return null;

    const parsed = JSON.parse(body);

    const userId = cleanNullableString(parsed?.userId);
    const role = cleanNullableString(parsed?.role)?.toUpperCase();
    const distributorId = cleanNullableString(parsed?.distributorId);
    const retailerId = cleanNullableString(parsed?.retailerId);
    const salesManagerId = cleanNullableString(parsed?.salesManagerId);
    const iat = Number(parsed?.iat);
    const exp = Number(parsed?.exp);

    if (!userId || !role) return null;
    if (!Number.isFinite(iat) || !Number.isFinite(exp)) return null;

    const now = Date.now();

    // expired
    if (exp <= now) return null;

    // absurd / tampered timestamps
    if (iat > now + MAX_CLOCK_SKEW_MS) return null;
    if (exp <= iat) return null;

    // optional max TTL guard against tampered far-future exp
    if (exp - iat > SESSION_TTL_MS + MAX_CLOCK_SKEW_MS) return null;

    return {
      userId,
      role,
      distributorId,
      retailerId,
      salesManagerId,
      iat,
      exp,
    };
  } catch {
    return null;
  }
}

async function readSignedSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  return verifySigned(raw);
}

/**
 * ✅ Read session
 */
export async function readSession(): Promise<SessionPayload | null> {
  return readSignedSession();
}

/**
 * ✅ Write signed session cookie
 */
export async function writeSession(payload: SessionPayload) {
  if (!payload?.userId || !String(payload.userId).trim()) {
    throw new Error("writeSession: userId is required");
  }

  if (!payload?.role || !String(payload.role).trim()) {
    throw new Error("writeSession: role is required");
  }

  const cookieStore = await cookies();
  const token = encodeSigned(payload);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * ✅ Optional helper if you want direct token generation somewhere else
 */
export function signSession(payload: Omit<SessionPayload, "iat" | "exp">) {
  if (!payload?.userId || !String(payload.userId).trim()) {
    throw new Error("signSession: userId is required");
  }

  if (!payload?.role || !String(payload.role).trim()) {
    throw new Error("signSession: role is required");
  }

  return encodeSigned(payload);
}

/**
 * ✅ Optional helper if you want direct token verification somewhere else
 */
export function verifySession(token: string) {
  return verifySigned(token);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await readSession();
  if (!s?.userId || !s?.role) return null;

  return {
    id: s.userId,
    role: s.role,
    distributorId: s.distributorId ?? null,
    retailerId: s.retailerId ?? null,
    salesManagerId: s.salesManagerId ?? null,
  };
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) {
    throw new Error("Unauthorized (no session).");
  }
  return u;
}

export async function requireDistributorId() {
  const u = await requireUser();
  const distributorId = u.distributorId ?? null;

  if (!distributorId) {
    throw new Error("DistributorId missing (login/session issue).");
  }

  return distributorId;
}

/**
 * ✅ Generic role guard
 */
export async function requireRole(
  allowedRoles?: string[]
): Promise<RoleAuthOk | RoleAuthFail> {
  const u = await getSessionUser();

  if (!u?.id) {
    return { ok: false, error: "UNAUTHORIZED", status: 401 };
  }

  const role = String(u.role || "").trim().toUpperCase();
  const normalizedAllowed = (allowedRoles || [])
    .map((r) => String(r || "").trim().toUpperCase())
    .filter(Boolean);

  if (normalizedAllowed.length && !normalizedAllowed.includes(role)) {
    return { ok: false, error: "FORBIDDEN", status: 403 };
  }

  return {
    ok: true,
    userId: u.id,
    role,
    distributorId: u.distributorId ?? null,
    retailerId: u.retailerId ?? null,
    salesManagerId: u.salesManagerId ?? null,
  };
}

/**
 * ✅ Warehouse guard
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
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}