import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n"))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(v: Date | null) {
  if (!v) return "";
  const d = new Date(v);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(
  _: Request,
  ctx: { params: Promise<{ auditId: string }> }
) {
  const auth = await requireWarehouse();
  if (!(auth as any)?.ok) {
    return new Response("Unauthorized", { status: (auth as any).status || 401 });
  }

  const { auditId } = await ctx.params;
  if (!auditId) return new Response("auditId missing", { status: 400 });

  // ✅ Correct model + relation
  const audit = await prisma.retailerStockAudit.findUnique({
    where: { id: auditId },
    include: { items: true },
  });

  if (!audit) return new Response("Not found", { status: 404 });

  const header = [
    "SrNo",
    "Product",
    "Batch",
    "SystemQty",
    "PhysicalQty",
    "Variance",
  ].join(",");

  // ✅ Correct relation + typed callbacks
  const body = audit.items
    .sort((a: any, b: any) =>
      String(a.productId).localeCompare(String(b.productId))
    )
    .map((l: any, i: number) =>
      [
        i + 1,
        l.productId,
        "",
        l.systemQty,
        l.physicalQty,
        l.variance,
      ]
        .map(csvEscape)
        .join(",")
    )
    .join("\n");

  const csv = header + "\n" + body;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="warehouse_audit_${audit.id}.csv"`,
    },
  });
}