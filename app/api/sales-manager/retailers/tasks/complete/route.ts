import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: any) {
  return String(v ?? "").trim();
}

function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}

function remarkQualityScore(text: string) {
  const t = str(text);
  if (!t) return 0;

  const len = t.length;
  let score = 0;

  if (len >= 30) score++;
  if (len >= 60) score++;

  const lk = t.toLowerCase();
  if (/(retailer|shop|city|area|district|chemist|medical)/.test(lk)) score++;
  if (/(product|order|qty|bundle|upsell|reactivate|visit|call)/.test(lk)) score++;
  if (/(next|follow|tomorrow|date|plan)/.test(lk)) score++;

  return clamp(score, 0, 5);
}

async function requireSalesManager() {
  const u: any = await getSessionUser();

  if (!u) {
    return { ok: false as const, status: 401 as const, error: "UNAUTHORIZED" };
  }

  const role = String(u.role || "").toUpperCase();
  if (role !== "SALES_MANAGER" && role !== "ADMIN") {
    return { ok: false as const, status: 403 as const, error: "FORBIDDEN" };
  }

  return { ok: true as const, userId: String(u.id) };
}

export const POST = apiHandler(async function POST(req: Request) {
  const auth = await requireSalesManager();

  if (!auth.ok) {
    if (auth.status === 403) {
      throw forbidden(auth.error);
    }
    throw unauthorized(auth.error);
  }

  const body = await req.json().catch(() => null);
  const taskId = str(body?.taskId);
  const remarkText = str(body?.remarkText);

  if (!taskId) {
    throw badRequest("taskId required");
  }

  if (!remarkText) {
    throw badRequest("remarkText required (mandatory)");
  }

  const q = remarkQualityScore(remarkText);
  const smId = auth.userId;

  const task = await prisma.salesManagerTask.findFirst({
    where: { id: taskId, salesManagerId: smId },
    select: { id: true, status: true },
  });

  if (!task) {
    throw notFound("TASK_NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesManagerTaskRemark.create({
      data: {
        taskId,
        remarkText,
        qualityScore: q,
        aiFeedback: q <= 1 ? "Remark too vague. Add retailer/product + next step." : null,
      },
    });

    await tx.salesManagerTask.update({
      where: { id: taskId },
      data: {
        status: "DONE",
        completedAt: new Date(),
        remarkQuality: q,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    taskId,
    remarkQuality: q,
  });
});