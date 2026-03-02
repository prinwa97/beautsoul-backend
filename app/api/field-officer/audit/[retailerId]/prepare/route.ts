// app/api/field-officer/audit/[retailerId]/prepare/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cleanStr = (v: any) => String(v ?? "").trim();
const asInt = (v: any, d = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : d;
};
const toISO = (d: any) => (d ? new Date(d).toISOString() : null);

export async function GET(req: Request, ctx: { params: Promise<{ retailerId: string }> }) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false }, { status: 401 });

    if (String(u.role).toUpperCase() !== "FIELD_OFFICER")
      return NextResponse.json({ ok: false }, { status: 403 });

    const distributorId = String(u.distributorId || "");
    const { retailerId } = await ctx.params;
    const rid = cleanStr(retailerId);

    const key = (p: string, b: string | null, e: string | null) =>
      `${p}__${b || "NA"}__${e || "NOEXP"}`;

    const catalogMap = new Map<string, string>();

    async function loadCatalog(names: string[]) {
      if (!names.length) return;
      const cats = await prisma.productCatalog.findMany({
        where: { name: { in: names } } as any,
        select: { id: true, name: true },
      });
      cats.forEach((c) => catalogMap.set(cleanStr(c.name), c.id));
    }

    function row(p: string, b: string | null, e: string | null, qty: number) {
      return {
        rowId: key(p, b, e),
        productId: catalogMap.get(p) || "",
        productName: p,
        batchNo: b,
        expiryDate: e,
        systemQty: qty,
        physicalQty: null,
      };
    }

    // SNAPSHOT FIRST
    const snaps = await prisma.retailerStockSnapshot.findMany({
      where: { distributorId, retailerId: rid } as any,
      orderBy: [{ expiryDate: "asc" }],
    });

    if (snaps.length) {
      await loadCatalog(snaps.map((x) => cleanStr(x.productName)));

      return NextResponse.json({
        ok: true,
        source: "SNAPSHOT",
        items: snaps.map((s) =>
          row(cleanStr(s.productName), s.batchNo, toISO(s.expiryDate), asInt(s.qty))
        ),
      });
    }

    // FALLBACK → invoices
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const inv = await prisma.invoiceItem.findMany({
      where: {
        invoice: { distributorId, retailerId: rid, createdAt: { gte: since } } as any,
      } as any,
      select: { productName: true, batchNo: true, expiryDate: true, qty: true },
    });

    const map = new Map<string, any>();

    for (const i of inv as any[]) {
      const p = cleanStr(i.productName);
      const b = cleanStr(i.batchNo) || "NA";
      const e = toISO(i.expiryDate);
      const k = key(p, b, e);

      if (!map.has(k))
        map.set(k, { productName: p, batchNo: b, expiryISO: e, systemQty: 0 });

      map.get(k).systemQty += asInt(i.qty);
    }

    const vals = Array.from(map.values());
    await loadCatalog(vals.map((v) => v.productName));

    return NextResponse.json({
      ok: true,
      source: "INVOICE_FALLBACK",
      items: vals.map((v) => row(v.productName, v.batchNo, v.expiryISO, v.systemQty)),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}