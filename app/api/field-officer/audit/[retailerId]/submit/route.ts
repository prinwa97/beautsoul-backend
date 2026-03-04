// /app/api/field-officer/audit/[retailerId]/submit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------- utils -------------------- */
function cleanStr(v: any) {
  return String(v ?? "")
    .trim()
    .replace(/[`]/g, "")
    .replace(/\s+/g, " ");
}
function asInt(v: any, def = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : def;
}
function safeISODate(v: any) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}
function normBatch(v: any) {
  const x = cleanStr(v);
  return x ? x : "NA";
}
function expiryKey(d: Date | null) {
  return d ? d.toISOString() : null;
}
function key(p: string, b: string | null, eISO: string | null) {
  return `${p}__${b || "NA"}__${eISO || "NOEXP"}`;
}

type CleanAuditItem = {
  productName: string;
  batchNo: string;
  expiryDate: Date | null;
  systemQty: number;
  physicalQty: number | null;
};

/* delivered (purchase) map from invoices */
async function buildDeliveredMap(distributorId: string, retailerId: string) {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const inv = await prisma.invoiceItem.findMany({
    where: {
      invoice: { distributorId, retailerId, createdAt: { gte: since } } as any,
    } as any,
    select: { productName: true, batchNo: true, expiryDate: true, qty: true },
  });

  const m = new Map<string, number>();
  for (const i of inv as any[]) {
    const p = cleanStr(i.productName);
    if (!p) continue;

    const b = normBatch(i.batchNo);
    const e = i.expiryDate ? new Date(i.expiryDate) : null;
    const eISO = expiryKey(e);

    const k = key(p, b, eISO);
    m.set(k, (m.get(k) || 0) + Math.max(0, asInt(i.qty, 0)));
  }
  return m;
}

/* -------------------- handler -------------------- */
export async function POST(req: Request, ctx: { params: Promise<{ retailerId: string }> }) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const fieldOfficerId = cleanStr(u.id);
    const distributorId = u.distributorId ? cleanStr(u.distributorId) : "";
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Missing distributorId in session" }, { status: 400 });
    }

    const { retailerId } = await ctx.params;
    const rid = cleanStr(retailerId);
    if (!rid) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });

    const body: any = await req.json().catch(() => null);
    const itemsIn: any[] = Array.isArray(body?.items) ? body.items : [];
    if (!itemsIn.length) return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });

    const clean: CleanAuditItem[] = itemsIn
      .map((it: any): CleanAuditItem => {
        const productName = cleanStr(it?.productName);
        const batchNo = normBatch(it?.batchNo);
        const expiryDate = safeISODate(it?.expiryDate);
        const systemQty = asInt(it?.systemQty, 0);

        const physicalRaw = it?.physicalQty;
        const physicalQty = physicalRaw === "" || physicalRaw == null ? null : asInt(physicalRaw, 0);

        return { productName, batchNo, expiryDate, systemQty, physicalQty };
      })
      .filter((x) => Boolean(x.productName));

    if (!clean.length) return NextResponse.json({ ok: false, error: "No valid items" }, { status: 400 });

    for (const x of clean) {
      if (x.systemQty < 0) {
        return NextResponse.json({ ok: false, error: "System qty cannot be negative" }, { status: 400 });
      }
      if (x.physicalQty == null) {
        return NextResponse.json(
          { ok: false, error: `Physical qty required for: ${x.productName} (Batch ${x.batchNo})` },
          { status: 400 }
        );
      }
      if (x.physicalQty < 0) {
        return NextResponse.json({ ok: false, error: "Physical qty cannot be negative" }, { status: 400 });
      }
    }

    const deliveredMap = await buildDeliveredMap(distributorId, rid);

    const result = await prisma.$transaction(async (tx) => {
      const audit = await tx.retailerStockAudit.create({
        data: {
          distributorId,
          fieldOfficerId,
          retailerId: rid,
          auditDate: new Date(),
          items: {
            create: clean.map((x) => {
              const eISO = expiryKey(x.expiryDate);
              const k = key(x.productName, x.batchNo, eISO);
              const deliveredQty = deliveredMap.get(k) || 0;

              const physical = x.physicalQty!;
              const variance = physical - x.systemQty;

              // ✅ SOLD = delivered - physical
              const soldQty = Math.max(0, deliveredQty - physical);

              return {
                productName: x.productName,
                batchNo: x.batchNo || "NA",
                expiryDate: x.expiryDate,
                systemQty: x.systemQty,
                physicalQty: physical,
                variance,
                soldQty,
              };
            }),
          },
        } as any,
        select: { id: true, auditDate: true, createdAt: true },
      });

      // Snapshot update (truth = physical)
      for (const x of clean) {
        const truth = x.physicalQty ?? 0;
        const batchNoDb = x.batchNo || "NA";

        const existing = await tx.retailerStockSnapshot.findFirst({
          where: {
            distributorId,
            retailerId: rid,
            productName: x.productName,
            batchNo: batchNoDb,
            expiryDate: x.expiryDate,
          } as any,
          select: { id: true },
        });

        if (existing?.id) {
          await tx.retailerStockSnapshot.update({
            where: { id: existing.id },
            data: { qty: truth } as any,
          });
        } else {
          await tx.retailerStockSnapshot.create({
            data: {
              distributorId,
              retailerId: rid,
              productName: x.productName,
              batchNo: batchNoDb,
              expiryDate: x.expiryDate,
              qty: truth,
            } as any,
          });
        }
      }

      return audit;
    });

    return NextResponse.json({ ok: true, audit: result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}