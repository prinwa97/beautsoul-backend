// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/retailers/ai/insights/create-tasks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, forbidden, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function startOfDayIST(d = new Date()) {
  const x = new Date(d);
  const ist = new Date(x.getTime() + 330 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const day = ist.getUTCDate();
  const utc = new Date(Date.UTC(y, m, day, 0, 0, 0));
  return new Date(utc.getTime() - 330 * 60 * 1000);
}

function asPriority(type: string) {
  const t = String(type || "").toUpperCase();
  if (t.includes("RISK") || t.includes("DROP")) return 1;
  if (t.includes("PRODUCT")) return 2;
  return 3;
}

function asTaskType(insightType: string) {
  const t = String(insightType || "").toUpperCase();
  if (t.includes("RISK")) return "REACTIVATE_RETAILER";
  if (t.includes("PRODUCT")) return "PRODUCT_REVIVAL";
  if (t.includes("DROP")) return "CITY_FOCUS";
  return "UPSELL";
}

export const POST = apiHandler(async function POST(req: Request) {
  const session: any = await getSessionUser();

  if (!session) {
    throw unauthorized("UNAUTHORIZED");
  }

  const role = String(session.role || "").toUpperCase();
  if (role !== "SALES_MANAGER" && role !== "ADMIN") {
    throw forbidden("FORBIDDEN");
  }

  const salesManagerId = String(session.id || "");
  if (!salesManagerId) {
    throw unauthorized("INVALID_SESSION");
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    throw badRequest("INVALID_JSON");
  }

  const insightId = cleanStr(body.insightId);
  const insightType = cleanStr(body.insightType);
  const title = cleanStr(body.title);
  const summary = cleanStr(body.summary);

  const evidence = Array.isArray(body.evidence) ? body.evidence : [];
  const retailerIds = evidence
    .filter((e: any) => String(e?.kind || "").toUpperCase() === "RETAILER" && e?.id)
    .map((e: any) => String(e.id));

  const city = cleanStr(body.city);
  const productNames = Array.isArray(body.productNames)
    ? body.productNames.map((x: any) => String(x))
    : [];

  const day = startOfDayIST(new Date());

  if (!insightId || !title) {
    throw badRequest("insightId + title required");
  }

  // ✅ Deduplicate: same day + same insight
  const dedupeKey = `INSIGHT:${insightId}`;
  const existing = await prisma.salesManagerTask.findFirst({
    where: {
      salesManagerId,
      day,
      title: { contains: dedupeKey },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { ok: true, created: 0, reused: 1, taskIds: [existing.id] },
      { status: 200 }
    );
  }

  const taskType = asTaskType(insightType);
  const priority = asPriority(insightType);

  const createdTask = await prisma.salesManagerTask.create({
    data: {
      salesManagerId,
      day,
      type: taskType as any,
      priority,
      title: `${title} (${dedupeKey})`,
      aiReason: summary || "Generated from insight evidence.",
      city: city || null,
      retailerIds: retailerIds.length ? retailerIds : [],
      productNames: productNames.length ? productNames : [],
      expectedImpactMin: 3000,
      expectedImpactMax: 15000,
    } as any,
    select: { id: true },
  });

  return NextResponse.json(
    { ok: true, created: 1, reused: 0, taskIds: [createdTask.id] },
    { status: 200 }
  );
});