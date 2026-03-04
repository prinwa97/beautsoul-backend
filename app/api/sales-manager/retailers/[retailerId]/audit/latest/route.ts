// app/api/sales-manager/retailers/[retailerId]/audit/latest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: any) {
  return String(v ?? "").trim();
}
function asInt(v: any) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ retailerId: string }> }
) {
  try {
    await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    const { retailerId } = await params;
    const rid = clean(retailerId);
    if (!rid) {
      return NextResponse.json({ ok: false, error: "RETAILER_ID_REQUIRED" }, { status: 400 });
    }

    const url = new URL(req.url);
    const productName = clean(url.searchParams.get("productName"));

    const audit = await prisma.retailerStockAudit.findFirst({
      where: { retailerId: rid },
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

        // ✅ add soldQty if your table has it
        soldQty: true,
      },
    });

    // ✅ if soldQty is null/undefined, optionally derive a fallback
    // NOTE: This is only a "best guess". Real sold should come from FO input.
    const items2 = items.map((it: any) => {
      const systemQty = asInt(it.systemQty);
      const physicalQty = it.physicalQty == null ? null : asInt(it.physicalQty);

      const derivedSoldQty =
        it.soldQty != null
          ? asInt(it.soldQty)
          : physicalQty == null
          ? null
          : Math.max(0, systemQty - physicalQty);

      return { ...it, derivedSoldQty };
    });

    return NextResponse.json({ ok: true, audit, items: items2 });
  } catch (e: any) {
    console.error("SM AUDIT LATEST ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "FAILED", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}