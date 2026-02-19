import { prisma } from "@/lib/prisma";

type EarnArgs = {
  foUserId: string;
  points: number;
  reason: "ORDER" | "COLLECTION" | "AUDIT";
  refType: "order" | "ledger" | "audit";
  refId: string;
  meta?: any;
};

/**
 * ✅ Idempotent coin earn:
 * Same (refType, refId, reason) only once.
 */
export async function earnFoCoinsOnce(args: EarnArgs) {
  const points = Math.floor(Number(args.points || 0));
  if (!args.foUserId || !args.refId || points <= 0) return { ok: true, skipped: true as const };

  const existing = await prisma.foPointsLedger.findFirst({
    where: {
      foUserId: args.foUserId,
      refType: args.refType,
      refId: args.refId,
      reason: args.reason,
      type: "EARN",
    },
    select: { id: true },
  });

  if (existing) return { ok: true, skipped: true as const };

  await prisma.foPointsLedger.create({
    data: {
      foUserId: args.foUserId,
      type: "EARN",
      points,
      reason: args.reason,
      refType: args.refType,
      refId: args.refId,
      metaJson: args.meta ?? undefined,
    } as any,
  });

  return { ok: true, skipped: false as const };
}
