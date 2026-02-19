import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function onlyDigits(s: any) {
  return String(s ?? "").replace(/\D+/g, "");
}

function pickCity(po: any) {
  // India Post data varies; try best fields
  const c =
    po?.Block ||
    po?.Taluk ||
    po?.Name ||       // sometimes Name is most usable locality
    po?.District ||
    null;
  return c ? String(c).trim() : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ pincode: string }> }) {
  try {
    const { pincode } = await ctx.params;
    const pin = onlyDigits(pincode);

    if (!pin || pin.length !== 6) {
      return NextResponse.json({ ok: false, error: "PINCODE_INVALID" }, { status: 400 });
    }

    // India Post API
    const url = `https://api.postalpincode.in/pincode/${pin}`;
    const res = await fetch(url, {
      // allow caching on server a bit to reduce API calls
      // (still dynamic, but edge-caching isn't required)
      headers: { "User-Agent": "BeautSoul/1.0" },
    });

    const data = await res.json().catch(() => null);
    const row = Array.isArray(data) ? data[0] : null;

    if (!row || row.Status !== "Success" || !Array.isArray(row.PostOffice) || row.PostOffice.length === 0) {
      return NextResponse.json({ ok: false, error: "PINCODE_NOT_FOUND" }, { status: 404 });
    }

    const po = row.PostOffice[0];

    const city = pickCity(po);
    const district = po?.District ? String(po.District).trim() : null;
    const state = po?.State ? String(po.State).trim() : null;

    return NextResponse.json({
      ok: true,
      pincode: pin,
      city,
      district,
      state,
      // extra info (optional)
      postOffice: po?.Name ? String(po.Name).trim() : null,
      branchType: po?.BranchType ? String(po.BranchType).trim() : null,
      deliveryStatus: po?.DeliveryStatus ? String(po.DeliveryStatus).trim() : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
