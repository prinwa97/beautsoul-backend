import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function GET(req: Request, ctx: { params: { retailerId: string } }) {
  try {
    await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    const retailerId = String(ctx?.params?.retailerId || "").trim();
    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "RETAILER_ID_REQUIRED" }, { status: 400 });
    }

    const url = new URL(req.url);
    const productName = clean(url.searchParams.get("productName"));

    const audit = await prisma.retailerStockAudit.findFirst({
      where: { retailerId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    if (!audit) {
      return NextResponse.json({ ok: true, audit: null, items: [] });
    }

    const where: any = { auditId: audit.id };
    if (productName) where.productName = productName;

    const items = await prisma.retailerStockAuditItem.findMany({
      where,
      orderBy: [{ productName: "asc" }, { batchNo: "asc" }],
      select: {
        id: true,
        productName: true,
        batchNo: true,
        expiryDate: true,
        systemQty: true,
        physicalQty: true,
        variance: true,
      },
    });

    return NextResponse.json({ ok: true, audit, items });
  } catch (e: any) {
    console.error("SM AUDIT LATEST ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "FAILED", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}