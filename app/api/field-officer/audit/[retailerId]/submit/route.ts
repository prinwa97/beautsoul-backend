// /app/api/field-officer/audit/[retailerId]/submit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------- utils -------------------- */
function cleanStr(v: any) {
  // remove accidental backticks etc. ("BT001`" -> "BT001")
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

type CleanAuditItem = {
  productName: string;
  batchNo: string;
  expiryDate: Date | null;
  systemQty: number;
  physicalQty: number | null;
};

/* -------------------- handler -------------------- */
export async function POST(req: Request, ctx: { params: Promise<{ retailerId: string }> }) {
  try {
    // 1) auth
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

    const fieldOfficerId = cleanStr(u.id);
    const distributorId = u.distributorId ? cleanStr(u.distributorId) : "";
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Missing distributorId in session" }, { status: 400 });
    }

    // 2) params
    const { retailerId } = await ctx.params;
    const rid = cleanStr(retailerId);
    if (!rid) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });

    // 3) body
    const body: any = await req.json().catch(() => null);
    const itemsIn: any[] = Array.isArray(body?.items) ? body.items : [];
    if (!itemsIn.length) return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });

    // 4) normalize + validate (batch-wise)
    const clean: CleanAuditItem[] = itemsIn
      .map((it): CleanAuditItem => {
        const productName = cleanStr(it?.productName);
        const batchNo = cleanStr(it?.batchNo) || "NA"; // keep string, never null
        const expiryDate = safeISODate(it?.expiryDate); // Date | null
        const systemQty = asInt(it?.systemQty, 0);

        // physicalQty: submit me required
        const physicalRaw = it?.physicalQty;
        const physicalQty = physicalRaw === "" || physicalRaw == null ? null : asInt(physicalRaw, 0);

        return { productName, batchNo, expiryDate, systemQty, physicalQty };
      })
      .filter((x): x is CleanAuditItem => Boolean(x.productName));

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

    // 5) transaction: audit history + snapshot (NO UPSERT without @@unique)
    const result = await prisma.$transaction(async (tx) => {
      // (A) Audit history (batch-wise)
      const audit = await tx.retailerStockAudit.create({
        data: {
          distributorId,
          fieldOfficerId,
          retailerId: rid,
          auditDate: new Date(),
          items: {
            create: clean.map((x) => ({
              productName: x.productName,
              batchNo: x.batchNo || "NA", // store string (NA), don't null
              expiryDate: x.expiryDate,
              systemQty: x.systemQty,
              physicalQty: x.physicalQty!, // validated above
              variance: x.physicalQty! - x.systemQty,
            })),
          },
        } as any,
        select: { id: true, auditDate: true, createdAt: true },
      });

      // (B) Current snapshot (truth = physical)
      for (const x of clean) {
        const truth = x.physicalQty ?? 0;
        const batchNoDb = x.batchNo || "NA"; // keep string

        // since schema has NO @@unique, we can't use upsert with composite key
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
            data: {
              qty: truth,
              // updatedAt auto @updatedAt
            } as any,
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