import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  return String(v ?? "").trim();
}
function asInt(v: any, def = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : def;
}

export async function GET(req: Request, ctx: { params: Promise<{ retailerId: string }> }) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

    const distributorId = u.distributorId ? String(u.distributorId) : null;
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Missing distributorId in session" }, { status: 400 });
    }

    const { retailerId } = await ctx.params;
    if (!retailerId) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });

    // 1) Primary: Snapshot (batch-wise)
    const snaps = await prisma.retailerStockSnapshot.findMany({
      where: { retailerId, distributorId } as any,
      select: { productName: true, batchNo: true, expiryDate: true, qty: true, updatedAt: true },
      orderBy: [{ productName: "asc" }, { expiryDate: "asc" }] as any,
    });

    // Build snapshot lookup for systemQty
    const snapKey = (p: string, b: string | null, e: string | null) => `${p}__${b || "NA"}__${e || "NOEXP"}`;
    const snapMap = new Map<string, number>();
    for (const s of snaps) {
      const p = cleanStr(s.productName);
      const b = s.batchNo ? cleanStr(s.batchNo) : null;
      const e = s.expiryDate ? new Date(s.expiryDate).toISOString() : null;
      snapMap.set(snapKey(p, b, e), asInt(s.qty, 0));
    }

    // 2) productId mapping (ProductCatalog)
    const allNames = Array.from(
      new Set(
        (snaps || [])
          .map((s) => cleanStr(s.productName))
          .filter(Boolean)
      )
    );

    // If no snapshot names, we'll fill names from fallback later
    const catalogByName = new Map<string, string>();
    async function loadCatalog(names: string[]) {
      if (!names.length) return;
      const cats = await prisma.productCatalog.findMany({
        where: { name: { in: names } } as any,
        select: { id: true, name: true },
      });
      for (const c of cats) catalogByName.set(cleanStr(c.name), String(c.id));
    }
    await loadCatalog(allNames);

    // Helper to build row
    function makeRow(productName: string, batchNo: string | null, expiryISO: string | null, systemQty: number) {
      const rowId = `${productName}__${batchNo || "NA"}__${expiryISO || "NOEXP"}`;
      return {
        rowId,
        productId: catalogByName.get(productName) || "",
        productName,
        batchNo,
        expiryDate: expiryISO,
        systemQty,
        physicalQty: null, // ✅ blank
      };
    }

    // ✅ If snapshot exists, return snapshot rows (normal)
    if (snaps.length) {
      const items = snaps.map((s) => {
        const productName = cleanStr(s.productName) || "—";
        const batchNo = s.batchNo ? cleanStr(s.batchNo) : null;
        const expiryISO = s.expiryDate ? new Date(s.expiryDate).toISOString() : null;
        const systemQty = asInt(s.qty, 0);
        return makeRow(productName, batchNo, expiryISO, systemQty);
      });

      return NextResponse.json({
        ok: true,
        retailerId,
        distributorId,
        source: "SNAPSHOT",
        items,
      });
    }

    // 3) ✅ Fallback: If snapshot empty, pull batch-wise from invoices (delivered batches)
    // NOTE: invoiceType might be RETAILER; retailerId is present in Invoice model
    const since = new Date();
    since.setMonth(since.getMonth() - 12); // last 12 months

    const invItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          distributorId,
          retailerId,
          createdAt: { gte: since },
        } as any,
      } as any,
      select: {
        productName: true,
        batchNo: true,
        expiryDate: true,
      },
      orderBy: [{ productName: "asc" }, { expiryDate: "asc" }] as any,
    });

    const uniq = new Map<string, { productName: string; batchNo: string | null; expiryISO: string | null }>();
    for (const it of invItems) {
      const p = cleanStr(it.productName);
      if (!p) continue;
      const b = it.batchNo ? cleanStr(it.batchNo) : null;
      const e = it.expiryDate ? new Date(it.expiryDate).toISOString() : null;
      const k = snapKey(p, b, e);
      if (!uniq.has(k)) uniq.set(k, { productName: p, batchNo: b, expiryISO: e });
    }

    const fallbackNames = Array.from(new Set(Array.from(uniq.values()).map((x) => x.productName)));
    await loadCatalog(fallbackNames);

    const items = Array.from(uniq.values()).map((x) => {
      const systemQty = snapMap.get(snapKey(x.productName, x.batchNo, x.expiryISO)) ?? 0; // snapshot nahi hai -> 0
      return makeRow(x.productName, x.batchNo, x.expiryISO, systemQty);
    });

    return NextResponse.json({
      ok: true,
      retailerId,
      distributorId,
      source: "INVOICE_FALLBACK",
      items,
      warning:
        items.length === 0
          ? "No snapshot yet and no invoice batches found for this retailer in last 12 months."
          : "Snapshot not found. Showing batch list from invoices. SystemQty is 0 until first audit submit.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
