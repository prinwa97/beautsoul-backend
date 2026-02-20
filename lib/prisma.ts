// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton (dev) + fresh client (prod)
 * - Prevents "too many clients" in dev hot-reload
 * - Avoids weird build-time crashes by giving a clear error if DATABASE_URL missing
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Returns a Prisma client instance.
 * Use inside request handlers (GET/POST) to avoid module-eval surprises.
 */
export function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;

  // Fail fast with a clear message (instead of cryptic Next build crash)
  if (!url || !String(url).trim()) {
    throw new Error(
      "DATABASE_URL is missing. Set it in Vercel Environment Variables (Preview/Production) and in local .env."
    );
  }

  // In production, create a new client (serverless-safe behavior)
  if (process.env.NODE_ENV === "production") {
    return new PrismaClient();
  }

  // In dev, reuse global singleton to prevent too many connections
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log:
        process.env.PRISMA_LOG === "1"
          ? ["query", "error", "warn"]
          : ["error", "warn"],
    });
  }

  return global.__prisma;
}

/**
 * Backward-compatible export if your code uses `import { prisma } from "@/lib/prisma"`
 * Prefer: `const prisma = getPrisma()` inside handlers.
 */
export const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? new PrismaClient()
    : (global.__prisma ??= new PrismaClient());
