import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  // 👇 Vercel build phase safety
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL missing (build phase), skipping prisma init");
    return undefined as any;
  }

  return new PrismaClient({
    log: ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
