"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ApiRow, Dist } from "./types";

/* -------------------- small utils -------------------- */

function clean(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}

// ✅ Optional string helper: returns undefined when empty
function opt(v: any): string | undefined {
  const s = clean(v);
  return s ? s : undefined;
}

// ✅ Any response shape -> array extractor
function pickArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.distributors)) return data.distributors;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

// ✅ normalize to Dist[]
function normalizeDists(arr: any[]): Dist[] {
  return arr
    .map((x: any) => ({
      id: String(x?.id ?? ""),
      name: String(x?.name ?? ""),
      code: x?.code ?? null,
      city: x?.city ?? null,
      state: x?.state ?? null,
      status: x?.status ?? null,
    }))
    .filter((d: Dist) => d.id && d.name);
}

function Badge({ text }: { text?: string | null }) {
  const t = String(text || "").toUpperCase();
  const cls =
    t === "ACTIVE"
      ? "bg-green-50 text-green-700 border-green-200"
      : t === "PENDING"
      ? "bg-yellow-50 text-yellow-800 border-yellow-200"
      : t === "INACTIVE"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-black ${cls}`}>
      {text || "-"}
    </span>
  );
}

function RolePill({ role }: { role: string }) {
  const r = String(role || "").toUpperCase();
  const cls =
    r === "DISTRIBUTOR"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : r === "FIELD_OFFICER"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-pink-50 text-pink-700 border-pink-200";

  return <span className={`px-2 py-0.5 rounded-full border text-[11px] font-black ${cls}`}>{role}</span>;
}

/* -------------------- main component -------------------- */

type RoleFilter = "ALL" | "RETAILER" | "DISTRIBUTOR" | "FIELD_OFFICER";

export default function UserDetailsPanel() {
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const [editing, setEditing] = useState<ApiRow | null>(null);
  const [busyId, setBusyId] = useState<string>(""); // disable actions for specific row

  // ✅ NEW: distributors list for edit dropdown
  const [dists, setDists] = useState<Dist[]>([]);
  const [distsLoading, setDistsLoading] = useState(false);

  async function loadDists() {
    setDistsLoading(true);
    try {
      const res = await fetch("/api/sales-manager/user/distributors/list", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      const raw = pickArray(data);
      const cleaned = normalizeDists(raw);
      setDists(cleaned);
    } catch {
      setDists([]);
    } finally {
      setDistsLoading(false);
    }
  }

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("role", roleFilter);
      if (q.trim()) sp.set("q", q.trim());
      sp.set("take", "500");

      const res = await fetch(`/api/sales-manager/user/users/list?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(String(data?.error || data?.message || "Failed to load users"));
        setRows([]);
        return;
      }

      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: any) {
      setErr(String(e?.message || "Network error"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // ✅ also load distributors once (for edit dropdown)
    loadDists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const countLabel = useMemo(() => {
    if (loading) return "";
    return `${rows.length} users`;
  }, [rows.length, loading]);

  async function onResetPassword(u: ApiRow) {
    const pw = prompt(`Enter NEW password for:\n${u.name} (${u.role})\n(min 6 chars)`);
    if (!pw) return;
    if (pw.trim().length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setBusyId(u.id);
    try {
      const res = await fetch("/api/sales-manager/user/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, newPassword: pw.trim() }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        alert(String(data?.error || data?.message || "Reset failed"));
        return;
      }

      alert("Password reset successful ✅");
    } catch (e: any) {
      alert(String(e?.message || "Network error"));
    } finally {
      setBusyId("");
    }
  }

  async function onSaveEdit(patch: Partial<ApiRow> & { distributorId?: string | null }) {
    if (!editing) return;

    setBusyId(editing.id);
    try {
      const res = await fetch("/api/sales-manager/user/users/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editing.id,
          name: patch.name,
          phone: patch.phone,
          city: patch.city,
          district: patch.district,
          state: patch.state,
          pincode: patch.pincode,
          address: patch.address,
          status: patch.status,
          // ✅ NEW: distributorId (for Retailer/FO)
          distributorId: patch.distributorId ?? undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        alert(String(data?.error || data?.message || "Update failed"));
        return;
      }

      setEditing(null);
      await load();
      alert("Updated ✅");
    } catch (e: any) {
      alert(String(e?.message || "Network error"));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mt-4 bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-gray-900">User Detail</h2>
          <div className="text-[11px] text-gray-500">{countLabel}</div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl border border-pink-200 bg-white font-semibold text-sm hover:bg-[#fff0f0]"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={loadDists}
            className="px-4 py-2 rounded-xl border border-pink-200 bg-white font-semibold text-sm hover:bg-[#fff0f0]"
          >
            Reload Distributors
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-700">Search</label>
          <div className="mt-1 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name / phone / code / city..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
            <button
              type="button"
              onClick={load}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white font-black hover:opacity-95"
            >
              Search
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
          >
            <option value="ALL">All</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="FIELD_OFFICER">Field Officer</option>
            <option value="RETAILER">Retailer</option>
          </select>
          <div className="mt-1 text-[11px] text-gray-500">
            Dists: {distsLoading ? "Loading..." : dists.length}
          </div>
        </div>
      </div>

      {err ? <div className="mt-3 text-sm font-semibold text-red-600">{err}</div> : null}
      {loading ? <div className="mt-4 text-sm text-gray-600">Loading users...</div> : null}

      {!loading && rows.length === 0 ? <div className="mt-4 text-sm text-gray-600">No users found.</div> : null}

      {!loading && rows.length > 0 ? (
        <div className="mt-4 overflow-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fff4f4] text-gray-700">
              <tr>
                <th className="text-left px-3 py-2 font-black">Name</th>
                <th className="text-left px-3 py-2 font-black">Login ID</th>
                <th className="text-left px-3 py-2 font-black">Role</th>
                <th className="text-left px-3 py-2 font-black">Distributor</th>
                <th className="text-left px-3 py-2 font-black">City</th>
                <th className="text-left px-3 py-2 font-black">Status</th>
                <th className="text-left px-3 py-2 font-black">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-semibold text-gray-900">{r.name}</td>
                  <td className="px-3 py-2 text-gray-700">{r.phone || "-"}</td>
                  <td className="px-3 py-2">
                    <RolePill role={r.role} />
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {r.distributor?.name ? (
                      <span>
                        {r.distributor.name}
                        {r.distributor.code ? ` (${r.distributor.code})` : ""}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.city || "-"}</td>
                  <td className="px-3 py-2">
                    <Badge text={r.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-black text-xs hover:bg-gray-50"
                        disabled={busyId === r.id}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onResetPassword(r)}
                        className="px-3 py-1.5 rounded-xl bg-gray-900 text-white font-black text-xs hover:opacity-95"
                        disabled={busyId === r.id}
                      >
                        {busyId === r.id ? "Please wait..." : "Reset Password"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Edit Modal */}
      {editing ? (
        <EditUserModal
          user={editing}
          dists={dists}
          distsLoading={distsLoading}
          onClose={() => setEditing(null)}
          onSave={onSaveEdit}
        />
      ) : null}
    </div>
  );
}

/* -------------------- Edit Modal -------------------- */

function EditUserModal({
  user,
  dists,
  distsLoading,
  onClose,
  onSave,
}: {
  user: ApiRow;
  dists: Dist[];
  distsLoading: boolean;
  onClose: () => void;
  onSave: (patch: Partial<ApiRow> & { distributorId?: string | null }) => void;
}) {
  const [name, setName] = useState(clean(user.name));
  const [phone, setPhone] = useState(clean(user.phone));
  const [city, setCity] = useState(clean(user.city));
  const [district, setDistrict] = useState(clean(user.district));
  const [state, setState] = useState(clean(user.state));
  const [pincode, setPincode] = useState(clean(user.pincode));
  const [address, setAddress] = useState(clean(user.address));

  // ✅ status toggle
  const [status, setStatus] = useState<string>(String(user.status || "ACTIVE").toUpperCase());

  // ✅ NEW: distributor selection (Retailer/FO only)
  const canEditDistributor = String(user.role || "").toUpperCase() === "RETAILER" || String(user.role || "").toUpperCase() === "FIELD_OFFICER";
  const [distributorId, setDistributorId] = useState<string>(String((user as any)?.distributorId || user.distributor?.id || ""));

  // ✅ if dropdown opens and distributorId empty -> select first
  useEffect(() => {
    if (!canEditDistributor) return;
    if (distsLoading) return;
    if (distributorId) return;
    if (dists.length === 0) return;
    setDistributorId(dists[0].id);
  }, [canEditDistributor, distsLoading, distributorId, dists]);

  const distLabel = useMemo(() => {
    const d = dists.find((x) => x.id === distributorId);
    if (!d) return "";
    const code = d.code ? ` (${d.code})` : "";
    const loc = [d.city, d.state].filter(Boolean).join(", ");
    return `${d.name}${code}${loc ? ` — ${loc}` : ""}`;
  }, [dists, distributorId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-pink-100 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">Edit User</h3>
            <div className="text-[11px] text-gray-500">
              {user.role} • {user.phone || "-"}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-black text-xs hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Phone (Login ID)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          {/* ✅ NEW: Distributor dropdown */}
          {canEditDistributor ? (
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-700">Distributor</label>
              <select
                value={distributorId}
                onChange={(e) => setDistributorId(e.target.value)}
                disabled={distsLoading}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
              >
                <option value="">
                  {distsLoading ? "Loading distributors..." : dists.length === 0 ? "No distributors found" : "Select distributor"}
                </option>
                {dists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.code ? ` (${d.code})` : ""}
                    {d.city ? ` — ${d.city}` : ""}
                    {d.state ? `, ${d.state}` : ""}
                  </option>
                ))}
              </select>

              <div className="mt-1 text-[11px] text-gray-500">
                {distLabel ? `Selected: ${distLabel}` : dists.length === 0 ? "Please create distributor first." : ""}
              </div>
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold text-gray-700">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">District</label>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">State</label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Pincode</label>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
        </div>

        {/* ✅ Status buttons */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-gray-700">Status</label>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("ACTIVE")}
              className={[
                "px-4 py-2 rounded-xl border text-sm font-black",
                status === "ACTIVE"
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50",
              ].join(" ")}
            >
              Active
            </button>

            <button
              type="button"
              onClick={() => setStatus("INACTIVE")}
              className={[
                "px-4 py-2 rounded-xl border text-sm font-black",
                status === "INACTIVE"
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50",
              ].join(" ")}
            >
              Inactive
            </button>
          </div>

          <div className="mt-1 text-[11px] text-gray-500">Inactive user login nahi kar sakega.</div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-gray-700">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200 min-h-[90px]"
          />
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white font-black text-sm hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() =>
              onSave({
                name: opt(name),
                phone: opt(phone),
                city: opt(city),
                district: opt(district),
                state: opt(state),
                pincode: opt(pincode),
                address: opt(address),
                status,
                // ✅ NEW
                distributorId: canEditDistributor ? (distributorId || null) : undefined,
              })
            }
            className="px-5 py-2 rounded-xl bg-gray-900 text-white font-black text-sm hover:opacity-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
