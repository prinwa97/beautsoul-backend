import PDFDocument from "pdfkit";
import path from "path";

type Party = {
  firmName: string;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: string | null;
  gstin?: string | null;
  phone?: string | null;
};

type InvoiceItemRow = {
  sn: number;
  description: string;
  hsn: string;
  qty: number;
  unit: string;
  price: number;
  taxable: number;
  cgstRate: number;
  cgstAmt: number;
  sgstRate: number;
  sgstAmt: number;
  igstRate: number;
  igstAmt: number;
  amount: number;
};

type InvoicePdfInput = {
  seller: Party;
  billedTo: Party;
  shippedTo: Party;

  invoiceNo: string;
  invoiceDate: string;

  placeOfSupply: string;
  stateCode: string;
  reverseCharge: "Y" | "N";

  transport?: string | null;
  vehicleNo?: string | null;
  grNo?: string | null;

  rows: InvoiceItemRow[];
  totals: {
    totalQty: number;
    taxableTotal: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    grandTotal: number;
  };

  amountInWords: string;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

function safe(v?: string | null) {
  return (v ?? "").toString().trim();
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(n || 0));
}

function fontPath(relFromPublic: string) {
  return path.join(process.cwd(), "public", relFromPublic);
}

function line(doc: PdfDoc, x1: number, y1: number, x2: number, y2: number) {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
}

function box(doc: PdfDoc, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).stroke();
}

export function buildInvoicePdfBuffer(data: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc: PdfDoc = new PDFDocument({ size: "A4", margin: 28 });

      // ✅ Use TTF fonts
      const REG = fontPath("fonts/Inter-Regular.ttf");
      const BOLD = fontPath("fonts/Inter-Bold.ttf");
      doc.registerFont("REG", REG);
      doc.registerFont("BOLD", BOLD);

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: any) => reject(err));

      const W = doc.page.width;
      const left = doc.page.margins.left;
      const right = W - doc.page.margins.right;
      const mid = (left + right) / 2;

      // ================= HEADER =================
      doc.font("BOLD").fontSize(14).text("TAX INVOICE", left, 20, { align: "center" });

      doc.moveDown(0.25);
      doc.font("BOLD").fontSize(18).text(safe(data.seller.firmName) || "SELLER", { align: "center" });

      const sellerLine1 = [safe(data.seller.address1)].filter(Boolean).join(", ");
      const sellerLine2 = [safe(data.seller.city), safe(data.seller.state), safe(data.seller.pin)]
        .filter(Boolean)
        .join(" ");
      const sellerLine3 = `GSTIN: ${safe(data.seller.gstin) || "-"}   Mobile: ${safe(data.seller.phone) || "-"}`;

      doc.font("REG").fontSize(10).text([sellerLine1, sellerLine2].filter(Boolean).join(", "), { align: "center" });
      doc.font("REG").fontSize(10).text(sellerLine3, { align: "center" });

      doc.moveDown(0.6);

      // ================= INVOICE INFO BOXES =================
      const topY = doc.y;
      const h = 88;

      box(doc, left, topY, mid - left, h);
      box(doc, mid, topY, right - mid, h);

      // Left: invoice meta
      let y = topY + 8;
      doc.font("REG").fontSize(10);
      doc.text(`Invoice No.: ${safe(data.invoiceNo)}`, left + 8, y);
      y += 16;
      doc.text(`Date: ${safe(data.invoiceDate)}`, left + 8, y);
      y += 16;
      doc.text(
        `Place of Supply: ${safe(data.placeOfSupply)} ${data.stateCode ? `(${data.stateCode})` : ""}`,
        left + 8,
        y
      );
      y += 16;
      doc.text(`Reverse Charge: ${safe(data.reverseCharge)}`, left + 8, y);

      // Right: transport
      y = topY + 8;
      doc.text(`GR/RR No.: ${safe(data.grNo)}`, mid + 8, y);
      y += 16;
      doc.text(`Transport: ${safe(data.transport)}`, mid + 8, y);
      y += 16;
      doc.text(`Vehicle No.: ${safe(data.vehicleNo)}`, mid + 8, y);

      doc.y = topY + h + 10;

      // ================= BILLED / SHIPPED =================
      const bsY = doc.y;
      const bsH = 104;

      box(doc, left, bsY, mid - left, bsH);
      box(doc, mid, bsY, right - mid, bsH);

      doc.font("BOLD").fontSize(10).text("Billed To:", left + 8, bsY + 8);
      doc.font("BOLD").fontSize(10).text("Shipped To:", mid + 8, bsY + 8);

      doc.font("REG").fontSize(10).text(safe(data.billedTo.firmName), left + 8, bsY + 24, { width: mid - left - 16 });
      doc.font("REG").fontSize(10).text(safe(data.shippedTo.firmName), mid + 8, bsY + 24, { width: right - mid - 16 });

      const billAddr = [safe(data.billedTo.address1), safe(data.billedTo.city), safe(data.billedTo.state), safe(data.billedTo.pin)]
        .filter(Boolean)
        .join(", ");
      const shipAddr = [safe(data.shippedTo.address1), safe(data.shippedTo.city), safe(data.shippedTo.state), safe(data.shippedTo.pin)]
        .filter(Boolean)
        .join(", ");

      doc.font("REG").fontSize(9).text(billAddr, left + 8, bsY + 42, { width: mid - left - 16 });
      doc.font("REG").fontSize(9).text(shipAddr, mid + 8, bsY + 42, { width: right - mid - 16 });

      doc.font("REG").fontSize(9).text(`GSTIN: ${safe(data.billedTo.gstin) || "-"}`, left + 8, bsY + 82);
      doc.font("REG").fontSize(9).text(`GSTIN: ${safe(data.shippedTo.gstin) || "-"}`, mid + 8, bsY + 82);

      doc.y = bsY + bsH + 10;

      // ================= ITEMS TABLE (FIXED) =================
      const tableLeft = left;
      const tableRight = right;

      const CW = {
        sn: 22,
        desc: 190,
        hsn: 38,
        qty: 34,
        rate: 52,
        taxable: 58,
        gst: 80,
        amt: 60,
      };

      const CX = {
        sn: tableLeft,
        desc: tableLeft + CW.sn,
        hsn: tableLeft + CW.sn + CW.desc,
        qty: tableLeft + CW.sn + CW.desc + CW.hsn,
        rate: tableLeft + CW.sn + CW.desc + CW.hsn + CW.qty,
        taxable: tableLeft + CW.sn + CW.desc + CW.hsn + CW.qty + CW.rate,
        gst: tableLeft + CW.sn + CW.desc + CW.hsn + CW.qty + CW.rate + CW.taxable,
        amt: tableLeft + CW.sn + CW.desc + CW.hsn + CW.qty + CW.rate + CW.taxable + CW.gst,
      };

      const tableY = doc.y;

      doc.font("BOLD").fontSize(9);
      doc.text("S.N.", CX.sn + 2, tableY, { width: CW.sn - 4 });
      doc.text("Description", CX.desc + 2, tableY, { width: CW.desc - 4 });
      doc.text("HSN", CX.hsn + 2, tableY, { width: CW.hsn - 4 });
      doc.text("Qty", CX.qty + 2, tableY, { width: CW.qty - 4, align: "right" });
      doc.text("Rate", CX.rate + 2, tableY, { width: CW.rate - 4, align: "right" });
      doc.text("Taxable", CX.taxable + 2, tableY, { width: CW.taxable - 4, align: "right" });
      doc.text("GST", CX.gst + 2, tableY, { width: CW.gst - 4 });
      doc.text("Amount", CX.amt + 2, tableY, { width: CW.amt - 4, align: "right" });

      line(doc, tableLeft, tableY - 4, tableRight, tableY - 4);
      line(doc, tableLeft, tableY + 12, tableRight, tableY + 12);

      doc.font("REG").fontSize(9);
      let rowY = tableY + 18;

      for (const r of data.rows) {
        const gstCompact =
          r.igstRate > 0
            ? `IGST ${r.igstRate}% ₹${inr(r.igstAmt)}`
            : `CGST ${r.cgstRate}% ₹${inr(r.cgstAmt)} / SGST ${r.sgstRate}% ₹${inr(r.sgstAmt)}`;

        const descH = doc.heightOfString(r.description || "", { width: CW.desc - 4 });
        const gstH = doc.heightOfString(gstCompact, { width: CW.gst - 4 });
        const rowH = Math.max(16, descH, gstH) + 6;

        doc.text(String(r.sn), CX.sn + 2, rowY, { width: CW.sn - 4 });
        doc.text(r.description || "", CX.desc + 2, rowY, { width: CW.desc - 4 });
        doc.text(r.hsn || "-", CX.hsn + 2, rowY, { width: CW.hsn - 4 });

        doc.text(inr(r.qty), CX.qty + 2, rowY, { width: CW.qty - 4, align: "right" });
        doc.text(inr(r.price), CX.rate + 2, rowY, { width: CW.rate - 4, align: "right" });
        doc.text(inr(r.taxable), CX.taxable + 2, rowY, { width: CW.taxable - 4, align: "right" });

        doc.text(gstCompact, CX.gst + 2, rowY, { width: CW.gst - 4 });
        doc.text(inr(r.amount), CX.amt + 2, rowY, { width: CW.amt - 4, align: "right" });

        rowY += rowH;

        // ✅ page break
        if (rowY > doc.page.height - 190) {
          doc.addPage();
          rowY = doc.y;
        }
      }

      line(doc, tableLeft, rowY, tableRight, rowY);

      // ================= TOTALS SUMMARY =================
      const sumY = rowY + 8;
      const sumW = 240;
      const sumX = right - sumW;

      box(doc, sumX, sumY, sumW, 90);

      doc.font("REG").fontSize(10);
      let sy = sumY + 8;
      doc.text(`Taxable: ₹ ${inr(data.totals.taxableTotal)}`, sumX + 8, sy); sy += 16;
      doc.text(`CGST: ₹ ${inr(data.totals.cgstTotal)}`, sumX + 8, sy); sy += 16;
      doc.text(`SGST: ₹ ${inr(data.totals.sgstTotal)}`, sumX + 8, sy); sy += 16;
      doc.text(`IGST: ₹ ${inr(data.totals.igstTotal)}`, sumX + 8, sy); sy += 16;

      doc.font("BOLD").fontSize(11).text(`Grand Total: ₹ ${inr(data.totals.grandTotal)}`, sumX + 8, sy);

      doc.y = sumY + 95;

      // Amount in words
      doc.font("BOLD").fontSize(10).text("Amount (in words):", left, doc.y);
      doc.font("REG").fontSize(10).text(`Rupees ${data.amountInWords} Only`, left, doc.y + 14);

      doc.moveDown(2);

      // ================= FOOTER =================
      const footY = doc.y;

      doc.font("BOLD").fontSize(9).text("Terms & Conditions", left, footY);
      doc.font("REG").fontSize(9).text("1. Goods once sold will not be taken back.", left, footY + 14);
      doc.font("REG").fontSize(9).text("2. Interest @ 18% p.a. will be charged if payment is delayed.", left, footY + 28);
      doc.font("REG").fontSize(9).text("3. Subject to local jurisdiction only.", left, footY + 42);

      doc.font("REG").fontSize(9).text("Receiver's Signature :", right - 190, footY + 14);
      doc.font("REG").fontSize(9).text(`for ${safe(data.seller.firmName)}`, right - 190, footY + 40);
      doc.font("REG").fontSize(9).text("Authorised Signatory", right - 190, footY + 58);

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}