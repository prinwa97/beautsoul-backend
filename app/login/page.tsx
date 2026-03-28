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
        credentials: "include",
        body: JSON.stringify({ phone: only10Digits(phone), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg({ type: "err", text: data?.error || "Login failed" });
        return;
      }

      const role = data?.user?.role;
      if (role === "ADMIN") router.replace("/admin/products");
      else if (role === "WAREHOUSE_MANAGER") router.replace("/warehouse/dashboard");
      else if (role === "DISTRIBUTOR") router.replace("/distributor/dashboard");
      else if (role === "SALES_MANAGER") router.replace("/sales-manager/dashboard");
      else if (role === "STATE_BUSINESS_HEAD") router.replace("/state-head");
      else if (role === "FIELD_OFFICER") router.replace("/field-officer/orders");
      else if (role === "RETAILER") router.replace("/retailer");
      else router.replace("/");

      router.refresh();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#fff7f6] p-6">
      <img
        src="/icons/icon-192.png"
        alt="BeautSoul"
        className="absolute top-6 left-6 h-16 w-auto object-contain"
      />

      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-md text-gray-900"
      >
        <h1 className="text-2xl font-bold text-gray-900">BeautSoul Login</h1>
        <p className="mt-1 text-sm text-gray-600">Enter phone & password</p>

        {msg && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${
              msg.type === "ok"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-800">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(only10Digits(e.target.value))}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
            placeholder="10 digit mobile"
            inputMode="numeric"
            maxLength={10}
            required
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-800">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
            placeholder="Password"
            type="password"
            required
          />
        </div>

        <button
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-black py-2 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}