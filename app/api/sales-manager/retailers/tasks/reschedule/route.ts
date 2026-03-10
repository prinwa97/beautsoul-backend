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

function safeDate(s: any) {
  const d = new Date(String(s || ""));
  return Number.isFinite(d.getTime()) ? d : null;
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
  const dueAt = safeDate(body?.dueAt);
  const remarkText = str(body?.remarkText);

  if (!taskId) {
    throw badRequest("taskId required");
  }

  if (!dueAt) {
    throw badRequest("dueAt required (ISO date)");
  }

  if (!remarkText) {
    throw badRequest("remarkText required (mandatory)");
  }

  const smId = auth.userId;

  const task = await prisma.salesManagerTask.findFirst({
    where: { id: taskId, salesManagerId: smId },
    select: { id: true },
  });

  if (!task) {
    throw notFound("TASK_NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesManagerTaskRemark.create({
      data: {
        taskId,
        remarkText,
        qualityScore: 2,
        aiFeedback: "Rescheduled with remark.",
      },
    });

    await tx.salesManagerTask.update({
      where: { id: taskId },
      data: {
        dueAt,
        status: "RESCHEDULED",
      },
    });
  });

  return NextResponse.json({
    ok: true,
    taskId,
    dueAt: dueAt.toISOString(),
  });
});