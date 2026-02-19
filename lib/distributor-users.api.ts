import type { DistributorUsersResp } from "./distributor-users.types";

async function readJson(res: Response) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as any)?.error || `Request failed: ${res.status}`);
  return j;
}

export async function fetchDistributorUsers(): Promise<DistributorUsersResp> {
  const res = await fetch("/api/distributor/users", { cache: "no-store" });
  return (await readJson(res)) as DistributorUsersResp;
}

export async function patchDistributorUser(id: string, body: any) {
  const res = await fetch(`/api/distributor/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson(res);
}

export async function resetDistributorUserPassword(id: string, type: "RETAILER" | "FIELD_OFFICER", newPassword: string) {
  const res = await fetch(`/api/distributor/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, newPassword }),
  });
  return readJson(res);
}

export async function createRetailer(payload: any) {
  // project me spelling mismatch hota hai: create-retailer vs create-retailer
  // pehle retailor try, fail ho to retailer
  let res = await fetch("/api/distributor/create-retailer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) return readJson(res);

  res = await fetch("/api/distributor/create-retailer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function createFieldOfficer(payload: any) {
  const res = await fetch("/api/distributor/create-field-officer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(res);
}
