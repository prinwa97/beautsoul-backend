import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

function clean(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}

function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthKey(monthKey: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return null;
  const d = new Date(y, mo - 1, 1);
  // prev month
  d.setMonth(d.getMonth() - 1);
  return monthKeyOf(d);
}

export async function POST(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error || "Unauthorized" }, { status: (auth as any).status || 401 });
  }

  const body = await req.json().catch(() => ({}));

  const foUserId = clean(body.foUserId);
  const monthKey = clean(body.monthKey); // NEXT month (YYYY-MM)
  const targetValue = Number(body.targetValue);

  if (!foUserId) return NextResponse.json({ ok: false, error: "foUserId required" }, { status: 400 });
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return NextResponse.json({ ok: false, error: "monthKey must be YYYY-MM" }, { status: 400 });
  }
  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    return NextResponse.json({ ok: false, error: "targetValue must be > 0" }, { status: 400 });
  }

  // If already locked, block
  const existing = await prisma.fieldOfficerTarget.findUnique({
    where: { foUserId_monthKey: { foUserId, monthKey } },
    select: { id: true, locked: true },
  });
  if (existing?.locked) {
    return NextResponse.json({ ok: false, error: "Target already locked" }, { status: 409 });
  }

  // ✅ RULE: next month target cannot be less than this month target
  const thisMonthKey = prevMonthKey(monthKey); // because API sets "next month"
  if (!thisMonthKey) {
    return NextResponse.json({ ok: false, error: "Invalid monthKey" }, { status: 400 });
  }

  const thisMonth = await prisma.fieldOfficerTarget.findUnique({
    where: { foUserId_monthKey: { foUserId, monthKey: thisMonthKey } },
    select: { targetValue: true },
  });

  const minAllowed = Number(thisMonth?.targetValue || 0);
  if (minAllowed > 0 && targetValue < minAllowed) {
    return NextResponse.json(
      { ok: false, error: `Next month target cannot be less than this month target (min ₹${minAllowed}).` },
      { status: 400 }
    );
  }

  // ✅ Save & lock
  const row = await prisma.fieldOfficerTarget.upsert({
    where: { foUserId_monthKey: { foUserId, monthKey } },
    update: { targetValue, locked: true },
    create: { foUserId, monthKey, targetValue, locked: true },
  });

  return NextResponse.json({ ok: true, row });
}