import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";
import { badRequest, forbidden } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------- zod schemas -------------------- */
const paramsSchema = z.object({
  retailerId: z.string().trim().min(1, "Retailer id is required"),
});

const querySchema = z.object({
  productName: z
    .string()
    .trim()
    .max(150, "Product name too long")
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
});

/* -------------------- utils -------------------- */
function asInt(v: unknown) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
    code: i.code,
  }));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ retailerId: string }> }
) {
  try {
    const me = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    const rawParams = await params;
    const { retailerId } = paramsSchema.parse(rawParams);

    const url = new URL(req.url);
    const { productName } = querySchema.parse({
      productName: url.searchParams.get("productName") ?? undefined,
    });

    const salesManagerId = String(
      (me as any)?.salesManagerId || (me as any)?.id || ""
    ).trim();

    const retailer = await prisma.retailer.findFirst({
      where: {
        id: retailerId,
        distributor: {
          salesManagerId,
        },
      },
      select: { id: true },
    });

    if (!retailer) {
      throw forbidden("RETAILER_NOT_UNDER_YOU");
    }

    const audit = await prisma.retailerStockAudit.findFirst({
      where: { retailerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!audit) {
      return NextResponse.json({
        ok: true,
        audit: null,
        items: [],
      });
    }

    const where: any = {
      auditId: audit.id,
      ...(productName ? { productName } : {}),
    };

    const items = await prisma.retailerStockAuditItem.findMany({
      where,
      orderBy: [{ productName: "asc" }, { batchNo: "asc" }, { expiryDate: "asc" }],
      select: {
        id: true,
        productName: true,
        batchNo: true,
        expiryDate: true,
        systemQty: true,
        physicalQty: true,
        variance: true,
        soldQty: true,
      },
    });

    const normalizedItems = items.map((it: any) => {
      const systemQty = asInt(it.systemQty);
      const physicalQty = it.physicalQty == null ? null : asInt(it.physicalQty);

      const variance =
        it.variance != null
          ? asInt(it.variance)
          : physicalQty == null
            ? null
            : physicalQty - systemQty;

      const derivedSoldQty =
        it.soldQty != null
          ? asInt(it.soldQty)
          : physicalQty == null
            ? null
            : Math.max(0, systemQty - physicalQty);

      return {
        id: it.id,
        productName: it.productName,
        batchNo: it.batchNo,
        expiryDate: it.expiryDate,
        systemQty,
        physicalQty,
        variance,
        soldQty: it.soldQty == null ? null : asInt(it.soldQty),
        derivedSoldQty,
      };
    });

    return NextResponse.json({
      ok: true,
      audit,
      items: normalizedItems,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      error = badRequest("VALIDATION_FAILED", {
        issues: formatZodIssues(error),
      } as any);
    }

    const status = Number(error?.status || error?.statusCode || 500);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Internal Server Error",
        code: error?.code || "INTERNAL_SERVER_ERROR",
        details: error?.details ?? undefined,
      },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}