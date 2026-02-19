"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/warehouse/dashboard", label: "Dashboard" },
  { href: "/warehouse/orders", label: "Orders" },
  { href: "/warehouse/inbound", label: "Inbound" },
  { href: "/warehouse/inbound-stock", label: "Stock In" },
  { href: "/warehouse/inventory", label: "Inventory" },
  { href: "/warehouse/audit", label: "Audit" },
  { href: "/warehouse/products", label: "Products" },
  { href: "/warehouse/reports", label: "Reports" },
];

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/warehouse/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-bold tracking-tight text-gray-800">
              BeautSoul Warehouse
            </div>
            <div className="text-xs text-gray-600">
              Payment Verify → Dispatch → Distributor Stock Sync
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition shadow"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-2 z-20 mb-4">
          <div className="backdrop-blur-md bg-white/80 border border-pink-100 shadow-md rounded-2xl px-3 py-2 flex gap-2 overflow-x-auto">
            {TABS.map((t) => {
              const active = isActive(t.href);

              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={
                    "px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 " +
                    (active
                      ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow"
                      : "text-gray-700 hover:bg-pink-50")
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-pink-100 shadow-lg rounded-2xl p-4 md:p-6">
          {children}
        </div>

      </div>
    </div>
  );
}
