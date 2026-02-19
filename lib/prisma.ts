// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function getClient() {
  if (global.__prisma) return global.__prisma;

  const client = new PrismaClient({
    log: ["error"],
  });

  // dev me reuse (hot reload)
  if (process.env.NODE_ENV !== "production") {
    global.__prisma = client;
  }

  return client;
}

/**
 * Lazy Prisma:
 * - PrismaClient import-time pe create nahi hota
 * - First actual query call pe create hota
 * - Vercel build phase crash avoid
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient() as any;
    return client[prop];
  },
});
