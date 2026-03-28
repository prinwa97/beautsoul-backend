"use client";

import React, { useEffect, useMemo, useState } from "react";
import PincodeAutoFill from "@/components/PincodeAutoFill";

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function validPhone(v: string) {
  return /^\d{10}$/.test(v);
}

function validGST(gst: string) {
  return /^[0-9A-Z]{15}$/.test(gst);
}

async function safeJson(res: Response) {
  const txt = await res.text().catch(() => "");
  try {
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

export default function CreateUserForm(props: any) {
  const { role, setRole, dists, distsLoading, distId, setDistId } = props;

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const [f, setF] = useState({
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

  const showDistributorPicker = role !== "DISTRIBUTOR";
  const showAddress = role !== "DISTRIBUTOR";
  const showGstField = role !== "FIELD_OFFICER";

  useEffect(() => {
    if (showDistributorPicker && !distId && dists.length > 0) {
      setDistId(dists[0].id);
    }
  }, [showDistributorPicker, dists, distId]);

  function setField(key: any, val: any) {
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
    if (submitting) return; // 🚀 prevent double click

    setErr("");
    setSuccess("");

    const nm = f.name.trim();
    const ph = onlyDigits(f.phone);
    const pw = f.password.trim();
    const gst = f.gstinOrGst.trim();

    if (!nm) return setErr("Name required");
    if (!validPhone(ph)) return setErr("Valid 10-digit phone required");
    if (pw.length < 6) return setErr("Password min 6 chars");

    if (showDistributorPicker && !distId) {
      return setErr("Select distributor");
    }

    if (role === "DISTRIBUTOR") {
      if (!validGST(gst)) return setErr("Valid GSTIN required");
    }

    setSubmitting(true);

    try {
      let url = "";
      const payload: any = {
        name: nm,
        phone: ph,
        password: pw,
        pincode: f.pincode,
        city: f.city,
        district: f.district,
        state: f.state,
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
        credentials: "include",
      });

      const data = await safeJson(res);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Create failed");
      }

      setSuccess("✅ User created successfully");
      resetForm();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-gray-900">
      <h2 className="text-xl font-bold">Create User</h2>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded-xl">{err}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-xl">{success}</div>}

      <input
        placeholder="Name"
        value={f.name}
        onChange={(e) => setField("name", e.target.value)}
        className="input"
      />

      <input
        placeholder="Phone"
        value={f.phone}
        onChange={(e) => setField("phone", onlyDigits(e.target.value))}
        className="input"
      />

      {showGstField && (
        <input
          placeholder="GSTIN"
          value={f.gstinOrGst}
          onChange={(e) => setField("gstinOrGst", e.target.value.toUpperCase())}
          className="input"
        />
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
      />

      {showAddress && (
        <textarea
          placeholder="Address"
          value={f.address}
          onChange={(e) => setField("address", e.target.value)}
          className="input"
        />
      )}

      <input
        type="password"
        placeholder="Password"
        value={f.password}
        onChange={(e) => setField("password", e.target.value)}
        className="input"
      />

      <button
        disabled={submitting}
        className="btn-primary"
      >
        {submitting ? "Saving..." : "Create User"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
        }
        .btn-primary {
          background: black;
          color: white;
          padding: 10px;
          border-radius: 10px;
        }
      `}</style>
    </form>
  );
}