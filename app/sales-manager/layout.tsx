"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../../components/LogoutButton";
import AppHeader from "@/components/AppHeader";

type SMMeta = {
  id: string;
  name: string;
  code?: string | null;
  status?: string | null;
};

const TABS = [
  { href: "/sales-manager/field-officers", label: "Field Officers" },
  { href: "/sales-manager/distributor-orders", label: "Create Order" },
  { href: "/sales-manager/retailers", label: "Retailers" },
  { href: "/sales-manager/create-user", label: "Create User" },
];

export default function SalesManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [sm, setSm] = useState<SMMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/sales-manager/dashboard", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        console.log("SM dashboard:", res.status, data);

        if (!alive) return;

        if (!res.ok) {
          setSm(null);
          return;
        }

        const meta =
          data?.salesManager ||
          data?.manager ||
          data?.user ||
          data?.me ||
          data?.data?.salesManager ||
          null;

        if (meta?.name) setSm(meta as SMMeta);
        else setSm(null);
      } catch (e) {
        console.log("SM dashboard error:", e);
        if (!alive) return;
        setSm(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const status = String(sm?.status || "").toUpperCase();
  const isActive = status === "ACTIVE";

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <AppHeader
        logoClassName="h-12 md:h-14 w-auto"
        logoWrapClassName="px-4 py-2"
        titleRow={
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Sales Manager Panel
            </h1>

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Sales Manager:</span>

              <span className="font-semibold text-gray-900">
                {loading
                  ? "Loading..."
                  : sm
                  ? `${sm.name}${sm.code ? ` (${sm.code})` : ""}`
                  : "—"}
              </span>

              {!!sm?.status && (
                <span
                  className={[
                    "text-[10px] px-2 py-0.5 rounded-full border font-semibold",
                    isActive
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-yellow-50 text-yellow-700 border-yellow-200",
                  ].join(" ")}
                >
                  {status}
                </span>
              )}
            </div>
          </div>
        }
        right={
          <div className="flex flex-col items-end justify-between h-full pr-2 py-1">
            <div className="flex items-start">
              <LogoutButton />
            </div>

            <div className="mt-3 flex gap-2">
              {TABS.map((tab) => (
                <NavBtn
                  key={tab.href}
                  href={tab.href}
                  active={pathname === tab.href || pathname?.startsWith(tab.href + "/")}
                >
                  {tab.label}
                </NavBtn>
              ))}
            </div>
          </div>
        }
        nav={null as any}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-8">{children}</main>
    </div>
  );
}

function NavBtn({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "px-4 py-2 rounded-2xl border text-sm font-semibold transition whitespace-nowrap inline-flex",
        active
          ? "bg-gray-900 border-gray-900 text-white shadow-sm"
          : "bg-white border-pink-200 text-gray-900 hover:shadow hover:bg-[#fff0f0]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
} 