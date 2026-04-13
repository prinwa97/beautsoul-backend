import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: any, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

function asStr(v: any) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const retailerId = asStr(url.searchParams.get("retailerId"));
    const take = Math.min(Math.max(toInt(url.searchParams.get("take"), 50), 1), 200);
    const skip = Math.max(toInt(url.searchParams.get("skip"), 0), 0);

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    // retailer ownership check
    const okRetailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true },
    });

    if (!okRetailer) {
      return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    }

    const [rows, total] = await Promise.all([
      prisma.retailerLedger.findMany({
        where: { distributorId, retailerId },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take,
        skip,
        select: {
          id: true,
          retailerId: true,
          distributorId: true,
          date: true,
          type: true,
          amount: true,
          reference: true,
          narration: true,
          createdAt: true,
        },
      }),
      prisma.retailerLedger.count({
        where: { distributorId, retailerId },
      }),
    ]);

    // collect possible invoice numbers from ledger references
    const refNos = Array.from(
      new Set(
        rows
          .map((r) => asStr(r.reference))
          .filter(Boolean)
      )
    );

    let invoiceMap = new Map<
      string,
      {
        id: string;
        invoiceNo: string;
      }
    >();

    if (refNos.length) {
      const invoices = await prisma.invoice.findMany({
        where: {
          distributorId,
          invoiceNo: { in: refNos },
        },
        select: {
          id: true,
          invoiceNo: true,
        },
      });

      invoiceMap = new Map(
        invoices.map((inv) => [
          asStr(inv.invoiceNo),
          {
            id: inv.id,
            invoiceNo: inv.invoiceNo,
          },
        ])
      );
    }

    const finalRows = rows.map((r) => {
      const ref = asStr(r.reference);
      const inv = ref ? invoiceMap.get(ref) : undefined;

      return {
        id: r.id,
        retailerId: r.retailerId,
        distributorId: r.distributorId,
        date: r.date,
        type: r.type,
        amount: r.amount,
        reference: ref || null,
        referenceId: inv?.id || null,
        referenceNo: inv?.invoiceNo || (ref || null),
        invoiceId: inv?.id || null,
        invoiceNo: inv?.invoiceNo || null,
        narration: r.narration,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        total,
        rows: finalRows,
        take,
        skip,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("ledger entries error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}