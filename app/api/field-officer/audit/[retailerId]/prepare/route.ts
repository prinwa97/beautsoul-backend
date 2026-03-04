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

function toISO(d: any) {
  if (!d) return null;
  const x = new Date(d);
  return Number.isFinite(x.getTime()) ? x.toISOString() : null;
}

function normBatch(b: any) {
  // keep stable key + avoid hidden chars
  const x = cleanStr(b).replace(/[`]/g, "");
  return x ? x : "NA";
}

function key(p: string, b: string | null, e: string | null) {
  return `${p}__${b || "NA"}__${e || "NOEXP"}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ retailerId: string }> }) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    if (String(u.role || "").toUpperCase() !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const distributorId = cleanStr(u.distributorId || "");
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "DISTRIBUTOR_REQUIRED" }, { status: 400 });
    }

    // params unwrap (Next sync dynamic api rule)
    const { retailerId } = await ctx.params;
    const rid = cleanStr(retailerId);
    if (!rid) {
      return NextResponse.json({ ok: false, error: "RETAILER_ID_REQUIRED" }, { status: 400 });
    }

    // -------- catalog map (optional) --------
    const catalogMap = new Map<string, string>();

    async function loadCatalog(names: string[]) {
      const uniq = Array.from(new Set(names.map(cleanStr).filter(Boolean)));
      if (!uniq.length) return;
      const cats = await prisma.productCatalog.findMany({
        where: { name: { in: uniq } } as any,
        select: { id: true, name: true },
      });
      cats.forEach((c) => catalogMap.set(cleanStr(c.name), c.id));
    }

    // -------- delivered qty (purchase) map (batch+expiry wise) --------
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const inv = await prisma.invoiceItem.findMany({
      where: {
        invoice: { distributorId, retailerId: rid, createdAt: { gte: since } } as any,
      } as any,
      select: { productName: true, batchNo: true, expiryDate: true, qty: true },
    });

    const deliveredMap = new Map<string, number>();
    for (const i of inv as any[]) {
      const p = cleanStr(i.productName);
      if (!p) continue;
      const b = normBatch(i.batchNo);
      const e = toISO(i.expiryDate);
      const k = key(p, b, e);
      deliveredMap.set(k, (deliveredMap.get(k) || 0) + Math.max(0, asInt(i.qty)));
    }

    function makeRow(p: string, b: string | null, e: string | null, systemQty: number) {
      const k = key(p, b, e);
      return {
        rowId: k,
        productId: catalogMap.get(p) || "",
        productName: p,
        batchNo: b,
        expiryDate: e,
        systemQty,
        deliveredQty: deliveredMap.get(k) || 0, // ✅ used for sold in UI/submit
        physicalQty: null as number | null,
      };
    }

    // -------- SNAPSHOT FIRST (current stock) --------
    const snaps = await prisma.retailerStockSnapshot.findMany({
      where: { distributorId, retailerId: rid } as any,
      orderBy: [{ expiryDate: "asc" }],
      select: { productName: true, batchNo: true, expiryDate: true, qty: true },
    });

    // ✅ IMPORTANT: When snapshot exists, show ONLY snapshot rows
    // This prevents Sys:0 duplicates created by invoice-only rows.
    if (snaps.length) {
      const snapNames = snaps.map((x) => cleanStr(x.productName));
      const invNames = Array.from(deliveredMap.keys()).map((k) => k.split("__")[0]);
      await loadCatalog([...snapNames, ...invNames]);

      const rows: any[] = [];
      for (const s of snaps) {
        const p = cleanStr(s.productName);
        const b = normBatch(s.batchNo);
        const e = toISO(s.expiryDate);
        rows.push(makeRow(p, b, e, Math.max(0, asInt(s.qty))));
      }

      return NextResponse.json({
        ok: true,
        source: "SNAPSHOT",
        meta: { deliveredWindow: "LAST_12_MONTHS" },
        items: rows,
      });
    }

    // -------- FALLBACK → invoices only (when snapshot empty) --------
    const vals: Array<{ productName: string; batchNo: string; expiryISO: string | null; deliveredQty: number }> = [];

    for (const [k2, deliveredQty] of deliveredMap.entries()) {
      const [p, b, e] = k2.split("__");
      vals.push({
        productName: cleanStr(p),
        batchNo: b || "NA",
        expiryISO: e === "NOEXP" ? null : e,
        deliveredQty,
      });
    }

    await loadCatalog(vals.map((v) => v.productName));

    return NextResponse.json({
      ok: true,
      source: "INVOICE_FALLBACK",
      meta: { deliveredWindow: "LAST_12_MONTHS" },
      items: vals.map((v) => ({
        rowId: key(v.productName, v.batchNo, v.expiryISO),
        productId: catalogMap.get(v.productName) || "",
        productName: v.productName,
        batchNo: v.batchNo,
        expiryDate: v.expiryISO,
        systemQty: v.deliveredQty, // fallback assumption
        deliveredQty: v.deliveredQty,
        physicalQty: null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}