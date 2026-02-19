// app/api/distributor/retailer-orders/invoices/[invoiceId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const distributorId = await requireDistributorId();
    const { invoiceId } = await ctx.params;

    if (!invoiceId) {
      return NextResponse.json({ ok: false, error: "invoiceId required" }, { status: 400 });
    }

    // ✅ invoice must belong to logged-in distributor (your schema supports distributorId)
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        distributorId,
      },
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        totalAmount: true,

        retailer: {
          select: { id: true, name: true, phone: true, city: true },
        },

        // ✅ if your relation is not `items`, rename to `invoiceItems`
        items: {
          select: {
            id: true,
            productName: true,
            qty: true,
            rate: true,
            amount: true,
            batchNo: true,
          },
          orderBy: { productName: "asc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, invoice });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}