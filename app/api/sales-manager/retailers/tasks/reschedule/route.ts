import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}
function str(v: any) {
  return String(v ?? "").trim();
}
function safeDate(s: any) {
  const d = new Date(String(s || ""));
  return Number.isFinite(d.getTime()) ? d : null;
}

async function requireSalesManager() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "UNAUTHORIZED" };
  const role = String(u.role || "").toUpperCase();
  if (role !== "SALES_MANAGER" && role !== "ADMIN")
    return { ok: false as const, status: 403 as const, error: "FORBIDDEN" };
  return { ok: true as const, userId: String(u.id) };
}

export async function POST(req: Request) {
  const auth = await requireSalesManager();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = await req.json().catch(() => null);
  const taskId = str(body?.taskId);
  const dueAt = safeDate(body?.dueAt);
  const remarkText = str(body?.remarkText);

  if (!taskId) return jsonError("taskId required", 400);
  if (!dueAt) return jsonError("dueAt required (ISO date)", 400);
  if (!remarkText) return jsonError("remarkText required (mandatory)", 400);

  const smId = auth.userId;

  const task = await prisma.salesManagerTask.findFirst({
    where: { id: taskId, salesManagerId: smId },
    select: { id: true },
  });
  if (!task) return jsonError("TASK_NOT_FOUND", 404);

  await prisma.$transaction(async (tx) => {
    await tx.salesManagerTaskRemark.create({
      data: { taskId, remarkText, qualityScore: 2, aiFeedback: "Rescheduled with remark." },
    });
    await tx.salesManagerTask.update({
      where: { id: taskId },
      data: { dueAt, status: "RESCHEDULED" },
    });
  });

  return NextResponse.json({ ok: true, taskId, dueAt: dueAt.toISOString() });
}