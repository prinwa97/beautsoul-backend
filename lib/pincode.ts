/**
 * India Post pincode lookup
 * - city, district, state auto-fill
 * - safe timeout + best-effort parsing
 */

function titleCase(s: string) {
  const x = String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!x) return null;
  return x
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function onlyDigits(s: any) {
  return String(s ?? "").replace(/\D+/g, "");
}

function pickCity(po: any) {
  // India Post sometimes gives Block/Taluk as local "city" like unit
  const raw =
    po?.Block ||
    po?.Taluk ||
    po?.Division ||
    po?.District ||
    po?.Name ||
    null;
  return raw ? titleCase(String(raw)) : null;
}

export function normalizePin(v: any) {
  const pin = onlyDigits(v);
  if (pin.length !== 6) return null;
  return pin;
}

export async function lookupPincode(pin6: string) {
  const pin = normalizePin(pin6);
  if (!pin) return { ok: false as const, error: "PINCODE_INVALID" };

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: ac.signal,
      headers: { "User-Agent": "BeautSoul/1.0" },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    const row = Array.isArray(data) ? data[0] : null;

    if (!row || row.Status !== "Success" || !Array.isArray(row.PostOffice) || row.PostOffice.length === 0) {
      return { ok: false as const, error: "PINCODE_NOT_FOUND" };
    }

    const po = row.PostOffice[0];
    const city = pickCity(po);
    const district = po?.District ? titleCase(String(po.District)) : null;
    const state = po?.State ? titleCase(String(po.State)) : null;

    return {
      ok: true as const,
      pincode: pin,
      city,
      district,
      state,
      postOffice: po?.Name ? titleCase(String(po.Name)) : null,
    };
  } catch (e: any) {
    return { ok: false as const, error: "PINCODE_LOOKUP_FAILED", message: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export function normText(v: any) {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s.length ? titleCase(s) : null;
}
