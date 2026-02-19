"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../../components/LogoutButton";
import AppHeader from "@/components/AppHeader";

type DistMeta = {
  id: string;
  name: string;
  code?: string | null;
  status?: string | null;
};

/* ✅ Confusion-free tab structure */
const TABS = [
  { href: "/distributor/dashboard", label: "Dashboard" },
  { href: "/distributor/stock", label: "Stock" },
  { href: "/distributor/retailer-orders", label: "Orders" },
  { href: "/distributor/sales", label: "Sales" },
  { href: "/distributor/ledger", label: "Ledger" },
  { href: "/distributor/reports", label: "Reports" },
  { href: "/distributor/users", label: "Users" },
];

export default function DistributorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [dist, setDist] = useState<DistMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/distributor/dashboard", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!alive) return;

        if (res.ok && data?.distributor?.name) setDist(data.distributor as DistMeta);
        else setDist(null);
      } catch {
        if (!alive) return;
        setDist(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const status = String(dist?.status || "").toUpperCase();
  const isActive = status === "ACTIVE";

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <AppHeader
        /* ✅ compact header height */
        logoClassName="h-12 md:h-14 w-auto"
        logoWrapClassName="px-4 py-2"
        titleRow={
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Distributor Panel
            </h1>

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">Distributor:</span>

              <span className="font-semibold text-gray-900">
                {loading ? "Loading..." : dist?.name || "—"}
                {!loading && dist?.code ? ` (${dist.code})` : ""}
              </span>

              {!!dist?.status && (
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
        /* ✅ Right side column: Logout top, Tabs below */
        right={
          <div className="flex flex-col items-end justify-between h-full pr-2 py-1">
            <div className="flex items-start">
              <LogoutButton />
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {TABS.map((t) => (
                <NavBtn key={t.href} href={t.href} active={isActiveTab(pathname, t.href)}>
                  {t.label}
                </NavBtn>
              ))}
            </div>
          </div>
        }
        /* ✅ nav empty (tabs moved to right block) */
        nav={null as any}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-8">{children}</main>
    </div>
  );
}

function isActiveTab(pathname: string, href: string) {
  if (href === "/distributor/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
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