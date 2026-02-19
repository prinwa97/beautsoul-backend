// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/create-user/create-user-form.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import PincodeAutoFill from "@/components/PincodeAutoFill";
import type { Dist, RoleKey, CreateUserFormState } from "./types";

export default function CreateUserForm({
  role,
  setRole,
  dists,
  distsLoading,
  distId,
  setDistId,
}: {
  role: RoleKey;
  setRole: (r: RoleKey) => void;
  dists: Dist[];
  distsLoading: boolean;
  distId: string;
  setDistId: (id: string) => void;
}) {
  // ✅ only for submit (create/update). DO NOT use this for edit-open loading
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const [f, setF] = useState<CreateUserFormState>({
    name: "",
    phone: "",
    pincode: "",
    city: "",
    district: "",
    state: "",
    address: "",
    gstinOrGst: "",
    password: "",
  });

  const showDistributorPicker = role === "RETAILER" || role === "FIELD_OFFICER";
  const showAddress = role === "RETAILER" || role === "FIELD_OFFICER";
  const showGstField = role === "DISTRIBUTOR" || role === "RETAILER";

  // ✅ IMPORTANT FIX: Retailer/FO me agar distId blank ho aur dists aa gaye ho => auto select first
  useEffect(() => {
    if (!showDistributorPicker) return;
    if (distsLoading) return;
    if (distId) return;
    if (dists.length === 0) return;

    setDistId(dists[0].id);
  }, [showDistributorPicker, distsLoading, distId, dists, setDistId]);

  const distLabel = useMemo(() => {
    const d = dists.find((x) => x.id === distId);
    if (!d) return "";
    const code = d.code ? ` (${d.code})` : "";
    const loc = [d.city, d.state].filter(Boolean).join(", ");
    return `${d.name}${code}${loc ? ` — ${loc}` : ""}`;
  }, [dists, distId]);

  function setField<K extends keyof CreateUserFormState>(key: K, val: CreateUserFormState[K]) {
    setF((p) => ({ ...p, [key]: val }));
  }

  function resetForm() {
    setF({
      name: "",
      phone: "",
      pincode: "",
      city: "",
      district: "",
      state: "",
      address: "",
      gstinOrGst: "",
      password: "",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const nm = f.name.trim();
    const ph = f.phone.trim();
    const pw = f.password.trim();
    const gst = f.gstinOrGst.trim();

    if (!nm) return setErr("Name required");
    if (!ph) return setErr("Phone required");
    if (!pw || pw.length < 6) return setErr("Password min 6 required");

    if (showDistributorPicker) {
      if (distsLoading) return setErr("Distributors loading...");
      if (!distId) return setErr("Please select distributor");
      if (dists.length === 0) return setErr("No distributors found. Please create distributor first.");
    }

    if (role === "DISTRIBUTOR" && !gst) return setErr("GST required");

    setSubmitting(true);
    try {
      let url = "";
      const payload: any = {
        name: nm,
        phone: ph,
        pincode: f.pincode,
        city: f.city,
        district: f.district,
        state: f.state,
        password: pw,
      };

      if (role === "DISTRIBUTOR") {
        url = "/api/sales-manager/user/create-distributor";
        payload.gstin = gst;
      } else if (role === "RETAILER") {
        url = "/api/sales-manager/user/create-retailer";
        payload.distributorId = distId;
        payload.address = f.address;
        payload.gst = gst || null;
      } else {
        url = "/api/sales-manager/user/create-field-officer";
        payload.distributorId = distId;
        payload.address = f.address;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(String(data?.error || data?.message || "Create failed"));
        return;
      }

      if (role === "DISTRIBUTOR") {
        alert(`Distributor created!\nCode: ${data.distributorCode}\nLogin Phone: ${data.loginPhone}`);
      } else if (role === "RETAILER") {
        alert(`Retailer created!\nCode: ${data.retailerCode}\nLogin Phone: ${data.loginPhone}`);
      } else {
        alert(`Field Officer created!\nCode: ${data.fieldOfficerCode}\nLogin Phone: ${data.loginPhone}`);
      }

      resetForm();
      if (role === "DISTRIBUTOR") setDistId("");
    } catch (e: any) {
      setErr(String(e?.message || "Network error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* selectors */}
      <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700">User Type</label>
            <select
              value={role}
              onChange={(e) => {
                const next = e.target.value as RoleKey;
                setRole(next);
                setErr("");
                if (next === "DISTRIBUTOR") setDistId("");
              }}
              disabled={submitting}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="RETAILER">Retailer</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="FIELD_OFFICER">Field Officer</option>
            </select>

            <div className="mt-1 text-[11px] text-gray-500">
              {role === "DISTRIBUTOR"
                ? "Distributor create: GST required."
                : role === "RETAILER"
                ? "Retailer create: distributor selection required."
                : "Field Officer create: distributor selection required."}
            </div>
          </div>

          <div className={showDistributorPicker ? "" : "opacity-50"}>
            <label className="text-xs font-semibold text-gray-700">Distributor</label>

            {/* DEBUG (enable if needed) */}
            {/* <div className="text-[11px] text-gray-500 mt-1">
              debug → role:{role} | show:{String(showDistributorPicker)} | distsLoading:{String(distsLoading)} | dists:{dists.length} | distId:{distId || "-"}
            </div> */}

            <select
              value={distId}
              onChange={(e) => setDistId(e.target.value)}
              disabled={!showDistributorPicker || distsLoading || submitting}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="">
                {distsLoading
                  ? "Loading distributors..."
                  : dists.length === 0
                  ? "No distributors found"
                  : "Select distributor"}
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
              {!showDistributorPicker
                ? "Not required for Distributor."
                : distsLoading
                ? "Loading distributors..."
                : distLabel
                ? `Selected: ${distLabel}`
                : dists.length === 0
                ? "Please create/activate a distributor first."
                : "Please select a distributor."}
            </div>
          </div>
        </div>
      </div>

      {/* create form */}
      <form onSubmit={onSubmit} className="mt-4 bg-white border border-pink-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-black text-gray-900">
            {role === "DISTRIBUTOR" ? "Create Distributor" : role === "RETAILER" ? "Create Retailer" : "Create Field Officer"}
          </h2>
          <div className="text-[11px] text-gray-500">Pincode auto-fill supported</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">
              {role === "DISTRIBUTOR" ? "Distributor Name" : role === "RETAILER" ? "Retailer Name" : "Name"}
            </label>
            <input
              value={f.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder={role === "DISTRIBUTOR" ? "Distributor name" : role === "RETAILER" ? "Retailer name" : "Field officer name"}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Phone</label>
            <input
              value={f.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="10-digit phone"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
              disabled={submitting}
            />
          </div>
        </div>

        {showGstField && (
          <div>
            <label className="text-xs font-semibold text-gray-700">{role === "DISTRIBUTOR" ? "GSTIN" : "GST (optional)"}</label>
            <input
              value={f.gstinOrGst}
              onChange={(e) => setField("gstinOrGst", e.target.value)}
              placeholder={role === "DISTRIBUTOR" ? "GSTIN (required)" : "GSTIN (optional)"}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
              disabled={submitting}
            />
          </div>
        )}

        <PincodeAutoFill
          pincode={f.pincode}
          setPincode={(v) => setField("pincode", v)}
          city={f.city}
          setCity={(v) => setField("city", v)}
          district={f.district}
          setDistrict={(v) => setField("district", v)}
          state={f.state}
          setState={(v) => setField("state", v)}
          disabled={submitting}
        />

        {showAddress && (
          <div>
            <label className="text-xs font-semibold text-gray-700">Address (optional)</label>
            <textarea
              value={f.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Full address"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200 min-h-[90px]"
              disabled={submitting}
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-700">Password</label>
          <input
            value={f.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="min 6 chars"
            type="password"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            disabled={submitting}
          />
        </div>

        {err ? <div className="text-sm font-semibold text-red-600">{err}</div> : null}

        <button
          type="submit"
          disabled={submitting}
          className={[
            "w-full md:w-auto px-6 py-2.5 rounded-2xl font-black text-white",
            submitting ? "bg-gray-400" : "bg-gray-900 hover:opacity-95",
          ].join(" ")}
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </>
  );
}
