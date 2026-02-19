import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { buildInvoicePdfBuffer } from "@/app/lib/pdf/invoicePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function round2(n: number) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Basic Indian number words (enough for invoices)
function amountInWordsINR(amount: number) {
  const a = Math.floor(Number(amount || 0));
  if (!Number.isFinite(a)) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const two = (n: number) => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`.trim();
  };

  const three = (n: number) => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return `${h ? ones[h] + " Hundred" : ""}${r ? (h ? " " : "") + two(r) : ""}`.trim();
  };

  let n = a;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const rest = n;

  const parts: string[] = [];
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${three(lakh)} Lakh`);
  if (thousand) parts.push(`${three(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  if (!parts.length) return "Zero";
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function requireDistributor() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const role = String(u.role || "").toUpperCase();
  if (!["DISTRIBUTOR", "ADMIN"].includes(role)) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  if (role === "DISTRIBUTOR" && !u.distributorId) {
    return { ok: false as const, status: 403 as const, error: "DistributorId missing in session" };
  }
  return { ok: true as const, user: u };
}

// quick state code map (extend as needed)
const STATE_CODE: Record<string, string> = {
  PUNJAB: "03",
  RAJASTHAN: "08",
  HARYANA: "06",
  DELHI: "07",
  GUJARAT: "24",
  MAHARASHTRA: "27",
  "UTTAR PRADESH": "09",
  "MADHYA PRADESH": "23",
};

// ✅ IMPORTANT: ctx type = any (Next 16 strict route type-checker workaround)
export async function GET(req: NextRequest, ctx: any) {
  try {
    const gate = await requireDistributor();
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const invoiceId = asStr(ctx?.params?.invoiceId);
    if (!invoiceId) return NextResponse.json({ ok: false, error: "invoiceId required" }, { status: 400 });

    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        distributor: true,
        retailer: true,
        items: true,
      },
    });

    if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

    // ownership
    const userRole = String((gate as any).user?.role || "").toUpperCase();
    if (userRole === "DISTRIBUTOR" && (inv as any).distributorId !== (gate as any).user?.distributorId) {
      return NextResponse.json({ ok: false, error: "Forbidden (not your invoice)" }, { status: 403 });
    }

    // ===== SELLER = Distributor =====
    const dist: any = (inv as any).distributor || {};
    const seller = {
      firmName: asStr(dist.firmName || dist.companyName || dist.tradeName || dist.name || "DISTRIBUTOR"),
      address1: asStr(dist.address1 || dist.address || ""),
      city: asStr(dist.city || ""),
      state: asStr(dist.state || ""),
      pin: asStr(dist.pincode || dist.pin || ""),
      gstin: asStr(dist.gstin || ""),
      phone: asStr(dist.phone || ""),
    };

    // ===== BUYER = Retailer =====
    const ret: any = (inv as any).retailer || {};
    const billedTo = {
      firmName: asStr(ret.firmName || ret.shopName || ret.name || "RETAILER"),
      address1: asStr(ret.address1 || ret.address || ""),
      city: asStr(ret.city || ""),
      state: asStr(ret.state || ""),
      pin: asStr(ret.pincode || ret.pin || ""),
      gstin: asStr(ret.gstin || ""),
      phone: asStr(ret.phone || ""),
    };

    const shippedTo = billedTo;

    // place of supply + state code
    const placeOfSupply = asStr((inv as any).placeOfSupply || (inv as any).shipState || billedTo.state || "");
    const stateCode =
      asStr((inv as any).stateCode || (inv as any).placeOfSupplyCode || "") ||
      (placeOfSupply ? STATE_CODE[placeOfSupply.toUpperCase()] || "" : "");

    const sellerState = asStr(seller.state);
    const isIntra = sellerState && placeOfSupply && sellerState.toLowerCase() === placeOfSupply.toLowerCase();

    // ===================== rows (PRICE INCLUDES GST) =====================
    const items: any[] = (inv as any).items || [];
    const rows = items.map((it: any, idx: number) => {
      const qty = Number(it.qty ?? it.quantity ?? 0);

      // ✅ Rate is GST INCLUDED
      const rateIncl = Number(it.rate ?? it.price ?? it.unitPrice ?? 0);

      // ✅ Gross line total (with GST)
      const gross = round2(qty * rateIncl);

      const gstRate = Number(it.gstRate ?? it.taxRate ?? 18);

      // ✅ taxable value from inclusive price
      const taxable = gstRate > 0 ? round2(gross / (1 + gstRate / 100)) : gross;

      // ✅ total gst amount
      const totalGst = round2(gross - taxable);

      // rates
      const halfRate = round2(gstRate / 2);
      const cgstRate = isIntra ? halfRate : 0;
      const sgstRate = isIntra ? halfRate : 0;
      const igstRate = isIntra ? 0 : gstRate;

      // amounts
      const cgstAmt = isIntra ? round2(totalGst / 2) : 0;
      const sgstAmt = isIntra ? round2(totalGst / 2) : 0;
      const igstAmt = isIntra ? 0 : totalGst;

      // ✅ Final amount should remain gross (because rate already includes GST)
      const amount = gross;

      return {
        sn: idx + 1,
        description: asStr(it.description || it.productName || "Item"),
        hsn: asStr(it.hsn || it.hsnCode || ""),
        qty,
        unit: asStr(it.unit || "Pcs"),
        price: rateIncl, // inclusive rate
        taxable, // ex-GST base
        cgstRate,
        cgstAmt,
        sgstRate,
        sgstAmt,
        igstRate,
        igstAmt,
        amount, // gross
      };
    });

    const totals = rows.reduce(
      (a: any, r: any) => {
        a.totalQty += r.qty;
        a.taxableTotal += r.taxable;
        a.cgstTotal += r.cgstAmt;
        a.sgstTotal += r.sgstAmt;
        a.igstTotal += r.igstAmt;
        a.grandTotal += r.amount;
        return a;
      },
      { totalQty: 0, taxableTotal: 0, cgstTotal: 0, sgstTotal: 0, igstTotal: 0, grandTotal: 0 }
    );

    totals.totalQty = round2(totals.totalQty);
    totals.taxableTotal = round2(totals.taxableTotal);
    totals.cgstTotal = round2(totals.cgstTotal);
    totals.sgstTotal = round2(totals.sgstTotal);
    totals.igstTotal = round2(totals.igstTotal);
    totals.grandTotal = round2(totals.grandTotal);

    const invNo = asStr((inv as any).invoiceNo || (inv as any).number || invoiceId);
    const invDate = (inv as any).invoiceDate
      ? asStr((inv as any).invoiceDate)
      : (inv as any).createdAt
      ? ymd(new Date((inv as any).createdAt))
      : "";

    const pdfBuffer = await buildInvoicePdfBuffer({
      seller,
      billedTo,
      shippedTo,
      invoiceNo: invNo,
      invoiceDate: invDate,
      placeOfSupply,
      stateCode,
      reverseCharge: asStr((inv as any).reverseCharge || "N") === "Y" ? "Y" : "N",
      transport: asStr((inv as any).transport || ""),
      vehicleNo: asStr((inv as any).vehicleNo || ""),
      grNo: asStr((inv as any).grNo || ""),
      rows,
      totals,
      amountInWords: amountInWordsINR(totals.grandTotal),
    });

    const fileName = `invoice-${invNo}.pdf`;

    const bytes = new Uint8Array(pdfBuffer);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}