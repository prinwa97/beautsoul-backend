import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

type SessionUser = {
  id?: string;
  role?: string;
  distributorId?: string | null;
} | null;

export function isWarehouse(me: SessionUser) {
  const role = String((me as any)?.role || "").toUpperCase();
  return !!me && (role === "WAREHOUSE_MANAGER" || role === "ADMIN");
}

export async function requireWarehouseOrAdmin() {
  const me: any = await getSessionUser();
  if (!me) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isWarehouse(me)) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  return me;
}
