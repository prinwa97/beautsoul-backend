import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const u: any = await getSessionUser();
  if (!u) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });

  const role = String(u.role || "").toUpperCase();
  if (role !== "FIELD_OFFICER") return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403 });

  const distributorId = u.distributorId ? String(u.distributorId) : null;
  if (!distributorId) return new Response(JSON.stringify({ ok: false, error: "Missing distributorId in session" }), { status: 400 });

  const { searchParams } = new URL(req.url);
  const retailerId = cleanStr(searchParams.get("retailerId"));
  if (!retailerId) return new Response(JSON.stringify({ ok: false, error: "retailerId required" }), { status: 400 });

  const retailer = await prisma.retailer.findFirst({
    where: { id: retailerId, distributorId },
    select: { id: true, name: true },
  });
  if (!retailer) return new Response(JSON.stringify({ ok: false, error: "Retailer not found" }), { status: 404 });

  const rows = await prisma.retailerLedger.findMany({
    where: { distributorId, retailerId },
    orderBy: { date: "desc" },
    select: { date: true, type: true, amount: true, reference: true, narration: true },
  });

  const header = ["Date", "Type", "Amount", "Reference", "Narration"];
  const lines = [header.join(",")];

  for (const r of rows) {
    const d = new Date(r.date);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    lines.push(
      [
        csvEscape(ymd),
        csvEscape(r.type),
        csvEscape(r.amount),
        csvEscape(r.reference || ""),
        csvEscape(r.narration || ""),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${retailer.name.replace(/[^a-z0-9\-_ ]/gi, "_")}-ledger.csv"`,
    },
  });
}
