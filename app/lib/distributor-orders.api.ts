export async function dispatchOrder(orderId: string) {
  const res = await fetch("/api/distributor/orders/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  // if server returns plain text error
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}

  if (!res.ok) {
    throw new Error(json?.error || text || "Dispatch failed");
  }

  return json; // { ok:true, order:{...} }
}
