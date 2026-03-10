// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/retailers/tasks/[taskId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function buildScript(task: any) {
  const type = String(task?.type || "").toUpperCase();
  const city = cleanStr(task?.city);
  const products = Array.isArray(task?.productNames)
    ? task.productNames.filter(Boolean)
    : [];

  if (type === "REACTIVATE_RETAILER") {
    return [
      "Namaste ji, last kuch din se order nahi aaya — main check karna chahta tha koi issue to nahi?",
      "Stock/price/response me koi problem? Aaj main aapke liye best fast-moving items suggest kar deta hoon.",
      products.length
        ? `Aaj aapke liye quick order suggestion: ${products.slice(0, 4).join(", ")}.`
        : "Aaj quick order me top moving items add kar dete hain, main list share karta hoon.",
      "Aap batao, aaj kitna order comfortable rahega? Main 2 options bana deta hoon (low & medium).",
      "Next follow-up: main kal call karke confirm kar dunga delivery/availability.",
    ];
  }

  if (type === "PRODUCT_REVIVAL") {
    return [
      `Sir/Madam, ${products[0] ? products[0] : "ye product"} city/area me slow chal raha hai — main reason samajhna chahta hoon.`,
      "Price / margin / customer demand / availability — inme se sabse bada issue kya lagta hai?",
      "Main aapke liye 1 bundle suggest karta hoon: (fast mover + slow mover) so rotation easy ho.",
      "Aaj trial order: chhota qty se start karte hain; feedback ke hisab se next week increase.",
      "Main 2 retailers ke comparison insights bhi share kar dunga jahan ye product chal raha hai.",
    ];
  }

  if (type === "CITY_FOCUS") {
    return [
      city ? `Is week focus city: ${city}.` : "Is week city focus.",
      "Top retailers ko visit + repeat cycle push karna hai.",
      products.length
        ? `Top products push: ${products.slice(0, 4).join(", ")}.`
        : "Top products push: fast movers + add-on SKUs.",
      "Goal: repeat order + basket size improve.",
      "Daily end me 2-line report: visited retailers + outcome + next steps.",
    ];
  }

  // default UPSELL
  return [
    "Namaste ji, aapka current order pattern achha hai — main aapko 2 high-conversion add-on suggest karna chahta hoon.",
    products.length
      ? `Suggested add-ons: ${products.slice(0, 4).join(", ")}.`
      : "Suggested add-ons: Sunscreen + Facewash + Toothbrush (example).",
    "Ye items similar retailers me repeat chal rahe hain; aapko quick turnover milega.",
    "Aaj chhota trial karte hain; next order me qty increase.",
    "Main aapko scheme/offer (agar available) bhi bata dunga.",
  ];
}

export const GET = apiHandler(async function GET(
  _req: Request,
  ctx: { params: Promise<{ taskId: string }> }
) {
  const session: any = await getSessionUser();

  if (!session) {
    throw unauthorized("UNAUTHORIZED");
  }

  const role = String(session.role || "").toUpperCase();
  if (role !== "SALES_MANAGER" && role !== "ADMIN") {
    throw forbidden("FORBIDDEN");
  }

  const salesManagerId = String(session.id || "");
  const { taskId } = await ctx.params;
  const id = cleanStr(taskId);

  if (!id) {
    throw badRequest("INVALID_TASK");
  }

  const task = await prisma.salesManagerTask.findFirst({
    where: { id, salesManagerId },
    include: {
      remarks: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!task) {
    throw notFound("NOT_FOUND");
  }

  const retailerIds = Array.isArray((task as any).retailerIds)
    ? (task as any).retailerIds
    : [];

  const retailers =
    retailerIds.length > 0
      ? await prisma.retailer.findMany({
          where: { id: { in: retailerIds.slice(0, 50) } },
          select: { id: true, name: true, city: true },
        })
      : [];

  const script = buildScript(task);

  return NextResponse.json({
    ok: true,
    task: {
      id: task.id,
      day: (task as any).day,
      type: (task as any).type,
      title: (task as any).title,
      status: (task as any).status,
      priority: (task as any).priority,
      city: (task as any).city,
      retailerIds: retailerIds,
      productNames: (task as any).productNames || [],
      aiReason: (task as any).aiReason,
      expectedImpactMin: (task as any).expectedImpactMin,
      expectedImpactMax: (task as any).expectedImpactMax,
    },
    retailers,
    script,
    recentRemarks: (task as any).remarks || [],
  });
});