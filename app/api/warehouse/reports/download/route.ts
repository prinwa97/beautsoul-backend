import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getRoleFromAuth(auth: any): string | null {
  return (
    auth?.user?.role ||
    auth?.role ||
    auth?.session?.role ||
    auth?.data?.user?.role ||
    null
  );
}

export async function GET(req: Request) {
  // ✅ requireWarehouse takes 0 args
  const auth = await requireWarehouse();
  if (!auth?.ok) {
    return NextResponse.json(
      { ok: false, error: auth?.error || "Unauthorized" },
      { status: (auth as any)?.status || 401 }
    );
  }

  // ✅ role guard
  const role = getRoleFromAuth(auth);
  if (!role || !["WAREHOUSE_MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "productwise").toLowerCase();
  const from = toDate(searchParams.get("from"));
  const to = toDate(searchParams.get("to"));

  let csv = "";

  // 1) PRODUCTWISE STOCK
  if (type === "productwise") {
    const rows = await prisma.stockLot.groupBy({
      by: ["productName"],
      where: { ownerType: "COMPANY" },
      _sum: { qtyOnHandPcs: true },
      orderBy: { _sum: { qtyOnHandPcs: "desc" } },
    });

    csv = "Product,Total Stock (pcs)\n";
    for (const r of rows) {
      csv += `${r.productName},${r._sum.qtyOnHandPcs || 0}\n`;
    }
  }

  // 2) DATEWISE STOCK-IN (by createdAt)
  else if (type === "datewise") {
    // ✅ safe parameterized SQL
    const rows = await prisma.$queryRaw<{ day: string; qty: number }[]>`
      select
        to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day,
        sum("qtyOnHandPcs")::int as qty
      from "StockLot"
      where "ownerType"='COMPANY'
        and (${from}::timestamptz is null or "createdAt" >= ${from}::timestamptz)
        and (${to}::timestamptz is null or "createdAt" <= ${to}::timestamptz)
      group by 1
      order by 1;
    `;

    csv = "Date,Stock In (pcs)\n";
    for (const r of rows) csv += `${r.day},${r.qty}\n`;
  }

  // 3) ORDERWISE REPORT
  else if (type === "orderwise") {
    const orders = await prisma.order.findMany({
      where: {
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { retailer: true, distributor: true },
      orderBy: { createdAt: "desc" },
    });

    csv = "Order No,Date,Distributor,Retailer,Status,Total Amount\n";
    for (const o of orders) {
      const distName = o.distributor?.name || "";
      const retName = (o as any).retailer?.name || ""; // ✅ correct casing
      const date = o.createdAt ? o.createdAt.toISOString().slice(0, 10) : "";
      csv += `${o.orderNo || ""},${date},${distName},${retName},${o.status || ""},${o.totalAmount || 0}\n`;
    }
  }

  // 4) STATEWISE ORDERS COUNT
  else if (type === "statewise") {
    const rows = await prisma.distributor.groupBy({
      by: ["state"],
      _count: { id: true },
    });

    csv = "State,Total Distributors\n";
    for (const r of rows) csv += `${r.state || ""},${r._count.id}\n`;
  }

  else {
    return NextResponse.json({ ok: false, error: "Invalid report type" }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=report_${type}.csv`,
    },
  });
}