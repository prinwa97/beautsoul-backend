import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import { forbidden, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler(async function GET() {
  const me: any = await getSessionUser();

  if (!me) {
    throw unauthorized("Unauthorized");
  }

  if (String(me.role || "").toUpperCase() !== "SALES_MANAGER") {
    throw forbidden("Forbidden");
  }

  const rows = await prisma.distributor.findMany({
    where: { salesManagerId: me.id } as any,
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      state: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    ok: true,
    distributors: rows,
  });
});