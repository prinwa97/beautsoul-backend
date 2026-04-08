// /app/distributor/users/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {
  DistributorUsersResp,
  FieldOfficer,
  Msg,
  Retailer,
  StatusOption,
} from "@/lib/distributor-users.types";
import {
  fetchDistributorUsers,
  createFieldOfficer,
  createRetailer,
  patchDistributorUser,
  resetDistributorUserPassword,
} from "@/lib/distributor-users.api";
import { only10Digits, isPhoneValid } from "@/lib/distributor-users.utils";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

function Badge({ v }: { v?: string | null }) {
  const value = (v || "-").toUpperCase();
  const cls =
    value === "ACTIVE"
      ? "bg-green-50 text-green-700 border-green-200"
      : value === "INACTIVE"
      ? "bg-gray-50 text-gray-700 border-gray-200"
      : "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${cls}`}
    >
      {value}
    </span>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[14px] font-black">{title}</div>
      {sub ? <div className="mt-0.5 text-[12px] text-gray-500">{sub}</div> : null}
    </div>
  );
}

export default function DistributorUsersPage() {
  const [tab, setTab] = useState<
    "RETAILERS" | "FIELD_OFFICERS" | "CREATE_RETAILER" | "CREATE_FO"
  >("RETAILERS");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DistributorUsersResp | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const [editRetailer, setEditRetailer] = useState<Retailer | null>(null);
  const [editFO, setEditFO] = useState<FieldOfficer | null>(null);

  // Create Retailer
  const [crName, setCrName] = useState("");
  const [crPhone, setCrPhone] = useState("");
  const [crGst, setCrGst] = useState("");
  const [crAddress, setCrAddress] = useState("");
  const [crCity, setCrCity] = useState("");
  const [crDistrict, setCrDistrict] = useState("");
  const [crState, setCrState] = useState("");
  const [crPincode, setCrPincode] = useState("");
  const [crStatus, setCrStatus] = useState("PENDING");
  const [crPassword, setCrPassword] = useState("");

  // Create FO
  const [foName, setFoName] = useState("");
  const [foPhone, setFoPhone] = useState("");
  const [foAddress, setFoAddress] = useState("");
  const [foCity, setFoCity] = useState("");
  const [foDistrict, setFoDistrict] = useState("");
  const [foState, setFoState] = useState("");
  const [foPincode, setFoPincode] = useState("");
  const [foStatus, setFoStatus] = useState("ACTIVE");
  const [foPassword, setFoPassword] = useState("");

  const statusOptions: StatusOption[] = useMemo(
    () => [
      { value: "PENDING", label: "PENDING" },
      { value: "ACTIVE", label: "ACTIVE" },
      { value: "INACTIVE", label: "INACTIVE" },
    ],
    []
  );

  const retailers = useMemo(() => data?.retailers || [], [data]);
  const fos = useMemo(() => data?.fieldOfficers || [], [data]);

  const canCreateRetailer =
    crName.trim().length >= 2 &&
    isPhoneValid(crPhone) &&
    crPassword.trim().length >= 6;

  const canCreateFO =
    foName.trim().length >= 2 &&
    isPhoneValid(foPhone) &&
    foPassword.trim().length >= 6;

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const j = await fetchDistributorUsers();
      setData(j);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resetPassword(id: string, type: "RETAILER" | "FIELD_OFFICER") {
    const newPassword = window.prompt("Naya password dalo (min 6 chars):");
    if (!newPassword) return;

    setMsg(null);
    try {
      await resetDistributorUserPassword(id, type, newPassword);
      setMsg({ type: "ok", text: "✅ Password reset ho gaya" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Reset failed" });
    }
  }

  async function saveRetailer() {
    const rid =
      (editRetailer as any)?.retailerId ||
      (editRetailer as any)?.id ||
      (editRetailer as any)?.userId;

    if (!rid) {
      alert("Retailer ID missing. Page reload karo.");
      return;
    }

    setMsg(null);
    try {
      await patchDistributorUser(
        rid,
        {
          id: rid,
          type: "RETAILER",
          name: editRetailer?.name,
          phone: editRetailer?.phone || null,
          gst: (editRetailer as any)?.gst || null,
          address: (editRetailer as any)?.address || null,
          city: (editRetailer as any)?.city || null,
          district: (editRetailer as any)?.district || null,
          state: (editRetailer as any)?.state || null,
          pincode: (editRetailer as any)?.pincode || null,
          status: (editRetailer as any)?.status || null,
        } as any
      );

      setEditRetailer(null);
      setMsg({ type: "ok", text: "✅ Retailer update ho gaya" });
      load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Update failed" });
    }
  }

  async function saveFO() {
    if (!editFO?.id) {
      alert("Field Officer ID missing. Page reload karo.");
      return;
    }

    setMsg(null);
    try {
      await patchDistributorUser(
        editFO.id,
        {
          id: editFO.id,
          type: "FIELD_OFFICER",
          name: editFO.name,
          code: editFO.code || null,
          phone: editFO.phone || null,
          address: editFO.address || null,
          city: editFO.city || null,
          district: (editFO as any)?.district || null,
          state: editFO.state || null,
          pincode: editFO.pincode || null,
          status: editFO.status || null,
        } as any
      );

      setEditFO(null);
      setMsg({ type: "ok", text: "✅ Field Officer update ho gaya" });
      load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Update failed" });
    }
  }

  async function createRetailerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!canCreateRetailer) {
      setMsg({
        type: "err",
        text: "Name, 10-digit Mobile aur Password (min 6) required hai.",
      });
      return;
    }

    try {
      await createRetailer(
        {
          name: crName.trim(),
          phone: only10Digits(crPhone),
          gst: crGst || null,
          address: crAddress || null,
          city: crCity || null,
          district: crDistrict || null,
          state: crState || null,
          pincode: crPincode || null,
          status: crStatus || null,
          password: crPassword.trim(),
        } as any
      );

      setMsg({ type: "ok", text: "✅ Retailer create ho gaya" });
      setCrName("");
      setCrPhone("");
      setCrGst("");
      setCrAddress("");
      setCrCity("");
      setCrDistrict("");
      setCrState("");
      setCrPincode("");
      setCrStatus("PENDING");
      setCrPassword("");
      setTab("RETAILERS");
      load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Create failed" });
    }
  }

  async function createFOSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!canCreateFO) {
      setMsg({
        type: "err",
        text: "Name, 10-digit Mobile aur Password (min 6) required hai.",
      });
      return;
    }

    try {
      await createFieldOfficer(
        {
          name: foName.trim(),
          phone: only10Digits(foPhone),
          address: foAddress || null,
          city: foCity || null,
          district: foDistrict || null,
          state: foState || null,
          pincode: foPincode || null,
          status: foStatus || null,
          password: foPassword.trim(),
        } as any
      );

      setMsg({ type: "ok", text: "✅ Field Officer create ho gaya" });
      setFoName("");
      setFoPhone("");
      setFoAddress("");
      setFoCity("");
      setFoDistrict("");
      setFoState("");
      setFoPincode("");
      setFoStatus("ACTIVE");
      setFoPassword("");
      setTab("FIELD_OFFICERS");
      load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Create failed" });
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-full border px-3 py-2 text-[12px] font-black transition ${
      active
        ? "border-black bg-black text-white"
        : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
    }`;

  const retailerRows = retailers.map((r: any, idx: number) => {
    const rid = r.retailerId || r.id || r.userId;
    const resetId = r.userId || rid;

    return (
      <tr
        key={`RETAILER-${rid}`}
        className={`border-b border-gray-100 ${
          idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
        } transition hover:bg-[#fff2f0]`}
      >
        <td className="px-4 py-3 font-black">{r.name}</td>
        <td className="px-4 py-3">{r.phone || "-"}</td>
        <td className="px-4 py-3">{r.city || "-"}</td>
        <td className="px-4 py-3">{r.district || "-"}</td>
        <td className="px-4 py-3">{r.state || "-"}</td>
        <td className="px-4 py-3">
          <Badge v={r.status} />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditRetailer({ ...r, id: rid })}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => resetPassword(resetId, "RETAILER")}
            >
              Reset Password
            </Button>
          </div>
        </td>
      </tr>
    );
  });

  const fieldOfficerRows = fos.map((fo: any, idx: number) => {
    return (
      <tr
        key={`FO-${fo.id}`}
        className={`border-b border-gray-100 ${
          idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
        } transition hover:bg-[#fff2f0]`}
      >
        <td className="px-4 py-3 font-black">{fo.name}</td>
        <td className="px-4 py-3">{fo.code || "-"}</td>
        <td className="px-4 py-3">{fo.phone || "-"}</td>
        <td className="px-4 py-3">{fo.city || "-"}</td>
        <td className="px-4 py-3">{fo.district || "-"}</td>
        <td className="px-4 py-3">{fo.state || "-"}</td>
        <td className="px-4 py-3">
          <Badge v={fo.status} />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditFO({ ...fo })}>
              Edit
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => resetPassword(fo.id, "FIELD_OFFICER")}
            >
              Reset Password
            </Button>
          </div>
        </td>
      </tr>
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7f6] via-white to-white">
      <div className="mx-auto max-w-[1100px] p-4 md:p-6">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[22px] font-black tracking-tight md:text-[26px]">
                Distributor • Users
              </div>
              <div className="mt-1 text-[12px] text-gray-500">
                Retailers aur Field Officers ka management (Edit • Status • Reset
                Password)
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={load} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={tabClass(tab === "RETAILERS")}
              onClick={() => setTab("RETAILERS")}
            >
              Retailers <span className="opacity-80">({retailers.length})</span>
            </button>

            <button
              type="button"
              className={tabClass(tab === "FIELD_OFFICERS")}
              onClick={() => setTab("FIELD_OFFICERS")}
            >
              Field Officers <span className="opacity-80">({fos.length})</span>
            </button>

            <button
              type="button"
              className={tabClass(tab === "CREATE_RETAILER")}
              onClick={() => setTab("CREATE_RETAILER")}
            >
              + Create Retailer
            </button>

            <button
              type="button"
              className={tabClass(tab === "CREATE_FO")}
              onClick={() => setTab("CREATE_FO")}
            >
              + Create Field Officer
            </button>
          </div>

          {msg && (
            <div
              className={`mt-4 rounded-2xl border p-3 text-[13px] font-extrabold ${
                msg.type === "ok"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-5">
          {tab === "RETAILERS" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 p-4 md:p-5">
                <SectionTitle
                  title="Retailer List"
                  sub="Edit details, update status, and reset passwords."
                />
              </div>

              {retailers.length === 0 ? (
                <div className="p-5 text-gray-600">No retailers found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 border-b border-gray-200 bg-gray-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-black">Name</th>
                        <th className="px-4 py-3 font-black">Phone</th>
                        <th className="px-4 py-3 font-black">City</th>
                        <th className="px-4 py-3 font-black">District</th>
                        <th className="px-4 py-3 font-black">State</th>
                        <th className="px-4 py-3 font-black">Status</th>
                        <th className="px-4 py-3 font-black">Actions</th>
                      </tr>
                    </thead>
                    <tbody>{retailerRows}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "FIELD_OFFICERS" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 p-4 md:p-5">
                <SectionTitle
                  title="Field Officer List"
                  sub="Edit FO details and reset passwords."
                />
              </div>

              {fos.length === 0 ? (
                <div className="p-5 text-gray-600">No field officers found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 border-b border-gray-200 bg-gray-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-black">Name</th>
                        <th className="px-4 py-3 font-black">Code</th>
                        <th className="px-4 py-3 font-black">Phone</th>
                        <th className="px-4 py-3 font-black">City</th>
                        <th className="px-4 py-3 font-black">District</th>
                        <th className="px-4 py-3 font-black">State</th>
                        <th className="px-4 py-3 font-black">Status</th>
                        <th className="px-4 py-3 font-black">Actions</th>
                      </tr>
                    </thead>
                    <tbody>{fieldOfficerRows}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "CREATE_RETAILER" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
              <SectionTitle
                title="Create Retailer"
                sub="Basic details fill karke retailer create karo."
              />

              <form onSubmit={createRetailerSubmit}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                  <Field
                    label="Name"
                    value={crName}
                    onChange={setCrName}
                    required
                    placeholder="Retailer name"
                  />
                  <Field
                    label="Mobile (10 digit)"
                    value={crPhone}
                    onChange={(v) => setCrPhone(only10Digits(v))}
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10 digit mobile"
                  />
                  <Field
                    label="Password (min 6)"
                    value={crPassword}
                    onChange={setCrPassword}
                    required
                    type="password"
                    placeholder="Create password"
                  />

                  <Field
                    label="GST (optional)"
                    value={crGst}
                    onChange={setCrGst}
                    placeholder="GST"
                  />
                  <Field
                    label="City"
                    value={crCity}
                    onChange={setCrCity}
                    placeholder="City"
                  />
                  <Field
                    label="District"
                    value={crDistrict}
                    onChange={setCrDistrict}
                    placeholder="District"
                  />

                  <Field
                    label="State"
                    value={crState}
                    onChange={setCrState}
                    placeholder="State"
                  />
                  <Field
                    label="Pincode"
                    value={crPincode}
                    onChange={setCrPincode}
                    placeholder="Pincode"
                  />
                  <Select
                    label="Status"
                    value={crStatus}
                    onChange={setCrStatus}
                    options={statusOptions}
                  />

                  <div className="md:col-span-3">
                    <Field
                      label="Address"
                      value={crAddress}
                      onChange={setCrAddress}
                      placeholder="Full address"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button type="submit" disabled={!canCreateRetailer}>
                    Create Retailer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCrName("");
                      setCrPhone("");
                      setCrGst("");
                      setCrAddress("");
                      setCrCity("");
                      setCrDistrict("");
                      setCrState("");
                      setCrPincode("");
                      setCrStatus("PENDING");
                      setCrPassword("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </div>
          )}

          {tab === "CREATE_FO" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
              <SectionTitle
                title="Create Field Officer"
                sub="FO ka account banao with password."
              />

              <form onSubmit={createFOSubmit}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                  <Field
                    label="Name"
                    value={foName}
                    onChange={setFoName}
                    required
                    placeholder="Field officer name"
                  />

                  <Field
                    label="Mobile (10 digit)"
                    value={foPhone}
                    onChange={(v) => setFoPhone(only10Digits(v))}
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10 digit mobile"
                  />

                  <Field
                    label="Password (min 6)"
                    value={foPassword}
                    onChange={setFoPassword}
                    required
                    type="password"
                    placeholder="Create password"
                  />

                  <Field
                    label="City"
                    value={foCity}
                    onChange={setFoCity}
                    placeholder="City"
                  />
                  <Field
                    label="District"
                    value={foDistrict}
                    onChange={setFoDistrict}
                    placeholder="District"
                  />

                  <Field
                    label="State"
                    value={foState}
                    onChange={setFoState}
                    placeholder="State"
                  />
                  <Field
                    label="Pincode"
                    value={foPincode}
                    onChange={setFoPincode}
                    placeholder="Pincode"
                  />
                  <Select
                    label="Status"
                    value={foStatus}
                    onChange={setFoStatus}
                    options={statusOptions}
                  />

                  <div className="md:col-span-3">
                    <Field
                      label="Address"
                      value={foAddress}
                      onChange={setFoAddress}
                      placeholder="Full address"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button type="submit" disabled={!canCreateFO}>
                    Create Field Officer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFoName("");
                      setFoPhone("");
                      setFoAddress("");
                      setFoCity("");
                      setFoDistrict("");
                      setFoState("");
                      setFoPincode("");
                      setFoStatus("ACTIVE");
                      setFoPassword("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        <Modal
          title="Edit Retailer"
          open={!!editRetailer}
          onClose={() => setEditRetailer(null)}
        >
          {editRetailer && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
              <Field
                label="Name"
                value={editRetailer.name || ""}
                onChange={(v) => setEditRetailer({ ...editRetailer, name: v })}
                required
              />
              <Field
                label="Mobile (10 digit)"
                value={editRetailer.phone || ""}
                onChange={(v) =>
                  setEditRetailer({ ...editRetailer, phone: only10Digits(v) })
                }
                inputMode="numeric"
                maxLength={10}
                placeholder="10 digit mobile"
              />
              <Field
                label="GST"
                value={(editRetailer as any).gst || ""}
                onChange={(v) =>
                  setEditRetailer({ ...(editRetailer as any), gst: v })
                }
              />

              <Field
                label="City"
                value={(editRetailer as any).city || ""}
                onChange={(v) =>
                  setEditRetailer({ ...(editRetailer as any), city: v })
                }
              />
              <Field
                label="District"
                value={(editRetailer as any).district || ""}
                onChange={(v) =>
                  setEditRetailer({ ...(editRetailer as any), district: v })
                }
              />
              <Field
                label="State"
                value={(editRetailer as any).state || ""}
                onChange={(v) =>
                  setEditRetailer({ ...(editRetailer as any), state: v })
                }
              />
              <Field
                label="Pincode"
                value={(editRetailer as any).pincode || ""}
                onChange={(v) =>
                  setEditRetailer({ ...(editRetailer as any), pincode: v })
                }
              />

              <div className="md:col-span-3">
                <Field
                  label="Address"
                  value={(editRetailer as any).address || ""}
                  onChange={(v) =>
                    setEditRetailer({ ...(editRetailer as any), address: v })
                  }
                />
              </div>

              <Select
                label="Status"
                value={(editRetailer as any).status || "PENDING"}
                onChange={(v) =>
                  setEditRetailer({ ...(editRetailer as any), status: v })
                }
                options={statusOptions}
              />

              <div className="mt-2 flex gap-2 md:col-span-3">
                <Button type="button" onClick={saveRetailer}>
                  Save Changes
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditRetailer(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          title="Edit Field Officer"
          open={!!editFO}
          onClose={() => setEditFO(null)}
        >
          {editFO && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
              <Field
                label="Name"
                value={editFO.name || ""}
                onChange={(v) => setEditFO({ ...editFO, name: v })}
                required
              />
              <Field
                label="Code"
                value={editFO.code || ""}
                onChange={(v) => setEditFO({ ...editFO, code: v })}
              />
              <Field
                label="Mobile (10 digit)"
                value={editFO.phone || ""}
                onChange={(v) => setEditFO({ ...editFO, phone: only10Digits(v) })}
                inputMode="numeric"
                maxLength={10}
                placeholder="10 digit mobile"
              />

              <Field
                label="City"
                value={editFO.city || ""}
                onChange={(v) => setEditFO({ ...editFO, city: v })}
              />
              <Field
                label="District"
                value={(editFO as any).district || ""}
                onChange={(v) => setEditFO({ ...(editFO as any), district: v })}
              />
              <Field
                label="State"
                value={editFO.state || ""}
                onChange={(v) => setEditFO({ ...editFO, state: v })}
              />
              <Field
                label="Pincode"
                value={editFO.pincode || ""}
                onChange={(v) => setEditFO({ ...editFO, pincode: v })}
              />

              <div className="md:col-span-3">
                <Field
                  label="Address"
                  value={editFO.address || ""}
                  onChange={(v) => setEditFO({ ...editFO, address: v })}
                />
              </div>

              <Select
                label="Status"
                value={editFO.status || "ACTIVE"}
                onChange={(v) => setEditFO({ ...editFO, status: v })}
                options={statusOptions}
              />

              <div className="mt-2 flex gap-2 md:col-span-3">
                <Button type="button" onClick={saveFO}>
                  Save Changes
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditFO(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}