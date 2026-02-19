"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { type: "ok" | "err"; text: string } | null;

function only10Digits(v: string) {
  return (v || "").replace(/\D/g, "").slice(0, 10);
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include", // cookie save + send
        body: JSON.stringify({ phone: only10Digits(phone), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg({ type: "err", text: data?.error || "Login failed" });
        setLoading(false);
        return;
      }

      // ✅ role-based redirect
      const role = data?.user?.role;
if (role === "ADMIN") router.replace("/admin/products");
else if (role === "WAREHOUSE_MANAGER") router.replace("/warehouse/dashboard");
else if (role === "DISTRIBUTOR") router.replace("/distributor/dashboard");
else if (role === "SALES_MANAGER") router.replace("/sales-manager");
else if (role === "STATE_BUSINESS_HEAD") router.replace("/state-head");
else if (role === "FIELD_OFFICER") router.replace("/field-officer/orders");
else if (role === "RETAILER") router.replace("/retailer");
else router.replace("/");

      router.refresh();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Network error" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff7f6] p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border rounded-2xl p-6 shadow">
        <h1 className="text-xl font-bold">BeautSoul Login</h1>
        <p className="text-sm text-gray-600 mt-1">Enter phone & password</p>

        {msg && (
          <div className={`mt-4 p-3 rounded-xl text-sm font-semibold border ${
            msg.type === "ok" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}>
            {msg.text}
          </div>
        )}

        <div className="mt-4">
          <label className="text-sm font-semibold">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(only10Digits(e.target.value))}
            className="mt-1 w-full border rounded-xl px-3 py-2"
            placeholder="10 digit mobile"
            inputMode="numeric"
            maxLength={10}
            required
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded-xl px-3 py-2"
            placeholder="Password"
            type="password"
            required
          />
        </div>

        <button
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-black text-white py-2 font-bold disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
