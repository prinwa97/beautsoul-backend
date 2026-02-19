import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const u: any = await getSessionUser();
    if (!u || String(u.role).toUpperCase() !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const retailerId = searchParams.get("retailerId");
    const invoiceId = searchParams.get("invoiceId");

    // AGAR RETAILER ID HAI -> Saari Invoices return karo
    if (retailerId) {
      const invoices = await prisma.invoice.findMany({
        where: { retailerId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNo: true,
          createdAt: true,
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,
        }
      });

      return NextResponse.json({
        ok: true,
        invoices: invoices.map(inv => ({
          ...inv,
          totalAmount: Number(inv.totalAmount || 0),
          paidAmount: Number(inv.paidAmount || 0),
        }))
      });
    }

    // AGAR INVOICE ID HAI -> Single Invoice ke items return karo (Old Logic)
    if (invoiceId) {
      const items = await prisma.invoiceItem.findMany({
        where: { invoiceId },
        select: { id: true, productName: true, qty: true, rate: true, amount: true }
      });
      return NextResponse.json({ ok: true, items });
    }

    return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}