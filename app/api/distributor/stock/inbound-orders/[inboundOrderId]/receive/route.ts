import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUser = {
  id: string;
  role?: string;
  distributorId?: string | null;
};

type Body = {
  items?: Array<{ itemId?: string; receivedQtyPcs?: number }>;
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function stripQuotes(s: string) {
  if (!s) return s;
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampInt(v: any, min: number, max: number) {
  const x = Math.floor(num(v));
  return Math.max(min, Math.min(max, x));
}

async function readSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw0 =
    store.get("session_user")?.value ||
    store.get("session")?.value ||
    store.get("sessionUser")?.value ||
    null;

  if (!raw0) return null;

  // 1) direct json
  const direct = safeJsonParse<SessionUser>(stripQuotes(raw0));
  if (direct?.id) {
    return {
      id: String(direct.id),
      role: direct.role,
      distributorId: direct.distributorId ?? null,
    };
  }

  // 2) decodeURIComponent json
  let decoded = raw0;
  try {
    decoded = decodeURIComponent(raw0);
  } catch {}

  const parsed = safeJsonParse<SessionUser>(stripQuotes(decoded));
  if (parsed?.id) {
    return {
      id: String(parsed.id),
      role: parsed.role,
      distributorId: parsed.distributorId ?? null,
    };
  }

  return null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  try {
    const { inboundOrderId: rawId } = await ctx.params;
    const inboundOrderId = String(rawId || "").trim();

    if (!inboundOrderId) {
      return NextResponse.json(
        { ok: false, error: "Missing inboundOrderId" },
        { status: 400 }
      );
    }

    // ✅ Distributor auth (single source of truth)
    const distributorId = await requireDistributorId();
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const items = Array.isArray(body?.items) ? body!.items! : [];

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Items required" }, { status: 400 });
    }

    // ✅ session user (for receivedBy). fallback if missing
    const session = await readSessionUser();

    // If your receivedBy MUST be a User.id and not Distributor.id, then you should
    // instead fetch user by phone/role etc. But for now we do safe fallback:
    const receivedByUserId = session?.id ? String(session.id) : String(distributorId);

    // ✅ Load order scoped to distributor (prevents forbidden confusion)
    const order = await prisma.inboundOrder.findFirst({
      where: { id: inboundOrderId, forDistributorId: distributorId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const itemById = new Map(order.items.map((x) => [x.id, x]));

    // ✅ Validate input + duplicates
    const seen = new Set<string>();
    for (const it of items) {
      const itemId = String(it?.itemId || "").trim();
      if (!itemId) {
        return NextResponse.json({ ok: false, error: "itemId missing" }, { status: 400 });
      }
      if (!itemById.has(itemId)) {
        return NextResponse.json(
          { ok: false, error: `Invalid itemId: ${itemId}` },
          { status: 400 }
        );
      }
      if (seen.has(itemId)) {
        return NextResponse.json(
          { ok: false, error: `Duplicate itemId: ${itemId}` },
          { status: 400 }
        );
      }
      seen.add(itemId);

      const src = itemById.get(itemId)!;
      const ordered = Math.max(0, Math.floor(num(src.orderedQtyPcs)));
      const received = num(it?.receivedQtyPcs);

      if (received < 0) {
        return NextResponse.json(
          { ok: false, error: "Received qty cannot be negative" },
          { status: 400 }
        );
      }
      if (received > ordered) {
        return NextResponse.json(
          { ok: false, error: "Received qty cannot exceed ordered qty" },
          { status: 400 }
        );
      }
    }

    const anyShort = items.some((it) => {
      const src = itemById.get(String(it.itemId))!;
      return num(it.receivedQtyPcs) < num(src.orderedQtyPcs);
    });

    const receiveStatus = anyShort ? "PARTIAL_RECEIVED" : "RECEIVED";

    const saved = await prisma.$transaction(async (tx) => {
      // 1) Create receive header
      const rec = await tx.inboundReceive.create({
        data: {
          inboundOrder: { connect: { id: inboundOrderId } },
          distributor: { connect: { id: distributorId } },
          receivedBy: { connect: { id: receivedByUserId } }, // ✅ robust
          status: receiveStatus,
          receivedAt: new Date(),
        },
        select: { id: true },
      });

      // 2) Receive items
      await tx.inboundReceiveItem.createMany({
        data: items.map((it) => {
          const src = itemById.get(String(it.itemId))!;
          const ordered = Math.max(0, Math.floor(num(src.orderedQtyPcs)));
          const received = clampInt(it.receivedQtyPcs, 0, ordered);

          return {
            inboundReceiveId: rec.id,
            productName: src.productName,
            orderedQtyPcs: ordered,
            receivedQtyPcs: received,
            shortQtyPcs: Math.max(0, ordered - received),
          };
        }),
        skipDuplicates: true, // ✅ safety
      });

      // 3) Update Inventory + InventoryBatch
      for (const it of items) {
        const src = itemById.get(String(it.itemId))!;
        const ordered = Math.max(0, Math.floor(num(src.orderedQtyPcs)));
        const received = clampInt(it.receivedQtyPcs, 0, ordered);

        if (received <= 0) continue;

        await tx.inventory.upsert({
          where: {
            distributorId_productName: {
              distributorId,
              productName: src.productName,
            },
          },
          create: {
            distributorId,
            productName: src.productName,
            qty: received,
          },
          update: {
            qty: { increment: received },
          },
        });

        const batchNo = String((src as any).batchNo || "").trim();
        const expiryDate = (src as any).expiryDate || null;

        if (batchNo && expiryDate) {
          await tx.inventoryBatch.upsert({
            where: {
              distributorId_productName_batchNo: {
                distributorId,
                productName: src.productName,
                batchNo,
              },
            },
            create: {
              distributorId,
              productName: src.productName,
              batchNo,
              expiryDate,
              qty: received,
            },
            update: {
              qty: { increment: received },
              expiryDate,
            },
          });
        }
      }

      // 4) Update order status
      await tx.inboundOrder.update({
        where: { id: inboundOrderId },
        data: {
          // ✅ fully received => DELIVERED, partial => IN_TRANSIT
          status: receiveStatus === "RECEIVED" ? "DELIVERED" : "IN_TRANSIT",
        },
      });

      return rec;
    });

    return NextResponse.json({
      ok: true,
      receiveId: saved.id,
      status: receiveStatus,
    });
  } catch (e: any) {
    console.error("Receive route error:", e);
    const msg = e?.message || "Server error";
    const status = msg.toLowerCase().includes("unauthor") ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
