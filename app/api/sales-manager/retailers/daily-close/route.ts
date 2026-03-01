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
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}

async function requireSalesManager() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "UNAUTHORIZED" };
  const role = String(u.role || "").toUpperCase();
  if (role !== "SALES_MANAGER" && role !== "ADMIN")
    return { ok: false as const, status: 403 as const, error: "FORBIDDEN" };
  return { ok: true as const, userId: String(u.id) };
}

async function computeScore(smId: string, day: Date) {
  const tasks = await prisma.salesManagerTask.findMany({
    where: { salesManagerId: smId, day },
    select: { status: true, remarkQuality: true },
  });

  const total = tasks.length || 1;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const weak = tasks.filter((t) => t.status === "DONE" && (t.remarkQuality || 0) <= 1).length;
  const open = tasks.filter((t) => t.status !== "DONE").length;

  const base = (done / total) * 70; // completion heavy
  const quality = ((done - weak) / Math.max(1, done)) * 20;
  const penalty = clamp(open * 3, 0, 30);

  return Math.round(clamp(base + quality - penalty, 0, 100));
}

export async function POST(req: Request) {
  const auth = await requireSalesManager();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = await req.json().catch(() => null);
  const closingRemark = str(body?.closingRemark);
  const dayStr = str(body?.day);

  if (!closingRemark) return jsonError("closingRemark required (mandatory)", 400);

  const day = startOfDay(dayStr ? new Date(dayStr) : new Date());
  const smId = auth.userId;

  const score = await computeScore(smId, day);

  const openCount = await prisma.salesManagerTask.count({
    where: { salesManagerId: smId, day, status: { not: "DONE" } as any },
  });

  const penaltiesApplied = openCount > 0 ? `${openCount} pending tasks at close` : "";

  const row = await prisma.salesManagerDailyClose.upsert({
    where: { salesManagerId_day: { salesManagerId: smId, day } },
    update: { closingRemark, score, penaltiesApplied },
    create: { salesManagerId: smId, day, closingRemark, score, penaltiesApplied },
  });

  return NextResponse.json({ ok: true, day: day.toISOString(), score, penaltiesApplied, id: row.id });
}