"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useOfflineSync } from "@/app/lib/offline/useOfflineSync";

const TABS = [
  { href: "/field-officer/home", label: "Home" },
  { href: "/field-officer/collection", label: "Collection" },
  { href: "/field-officer/orders", label: "Orders" },
  { href: "/field-officer/audit", label: "Audit" },
];

function isActive(pathname: string, href: string) {
  if (href === "/field-officer") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// ✅ Hydration-safe OnlineChip (SSR + first client render same)
function OnlineChip() {
  const [mounted, setMounted] = React.useState(false);
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);

    const update = () => setOnline(navigator.onLine);
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // ✅ SSR + hydration stable placeholder
  if (!mounted) {
    return (
      <span
        className="rounded-full border px-2 py-1 text-[11px] font-extrabold border-gray-200 bg-gray-50 text-gray-700"
        title="Checking"
      >
        ● Checking
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "rounded-full border px-2 py-1 text-[11px] font-extrabold",
        online ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
      )}
      title={online ? "Online" : "Offline"}
    >
      {online ? "● Online" : "● Offline"}
    </span>
  );
}

function OfflineSyncBar() {
  const { pending, syncing, msg, runSync } = useOfflineSync();

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <OnlineChip />
        <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-extrabold text-black/70">
          Pending: {pending}
        </span>
        {msg ? <span className="truncate text-[11px] font-bold text-black/50">{msg}</span> : null}
      </div>

      <button
        onClick={runSync}
        disabled={syncing || pending === 0}
        className={clsx(
          "shrink-0 rounded-full border px-3 py-1 text-[11px] font-extrabold",
          syncing || pending === 0
            ? "border-black/10 bg-gray-100 text-black/40"
            : "border-black bg-black text-white hover:opacity-90"
        )}
        title="Sync offline saved work to server"
        type="button"
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}

export default function FieldOfficerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleExit() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mx-auto w-full max-w-md px-2 pt-1">
        <div className="rounded-xl border border-black/10 bg-white p-2 shadow-sm">
          <div className="relative flex items-center justify-center">
            <Image
              src="/beautsoul-logo.png"
              alt="BeautSoul"
              width={140}
              height={40}
              priority
              className="h-10 w-auto"
            />

            {/* Exit Button */}
            <button
              onClick={handleExit}
              className="absolute right-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600"
              type="button"
            >
              Exit
            </button>
          </div>

          {/* ✅ Offline sync bar */}
          <OfflineSyncBar />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-md px-3 pb-24 pt-0">{children}</div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto w-full max-w-md px-2 pb-2">
          <div className="rounded-3xl border border-black/10 bg-white/95 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="grid grid-cols-4">
              {TABS.map((t) => {
                const active = isActive(pathname, t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={clsx("py-3 text-center text-xs font-extrabold", active ? "text-gray-900" : "text-gray-500")}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
