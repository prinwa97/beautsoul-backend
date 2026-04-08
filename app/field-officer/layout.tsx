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

  if (!mounted) {
    return (
      <span
        className="inline-flex h-7 items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 text-[11px] font-extrabold text-gray-700"
        title="Checking"
      >
        ● Checking
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-extrabold",
        online
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
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
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <OnlineChip />

        <span className="inline-flex h-7 items-center rounded-full border border-black/10 bg-gray-50 px-2.5 text-[11px] font-extrabold text-black/70">
          Pending: {pending}
        </span>

        {msg ? (
          <span className="min-w-0 max-w-full truncate text-[11px] font-bold text-black/50">
            {msg}
          </span>
        ) : null}
      </div>

      <button
        onClick={runSync}
        disabled={syncing || pending === 0}
        className={clsx(
          "inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-[11px] font-extrabold transition",
          syncing || pending === 0
            ? "border-black/10 bg-gray-100 text-black/40"
            : "border-black bg-black text-white active:scale-[0.98]"
        )}
        title="Sync offline saved work to server"
        type="button"
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}

export default function FieldOfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <div className="mx-auto w-full max-w-md px-3 pt-[max(10px,env(safe-area-inset-top))]">
        {/* Header */}
        <header className="rounded-2xl border border-black/10 bg-white px-3 py-3 shadow-sm">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div />

            <div className="flex justify-center">
              <Image
                src="/beautsoul-logo.png"
                alt="BeautSoul"
                width={150}
                height={42}
                priority
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleExit}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-extrabold text-red-600 transition active:scale-[0.98]"
                type="button"
              >
                Exit
              </button>
            </div>
          </div>

          <OfflineSyncBar />
        </header>

        {/* Content */}
        <main className="pb-[110px] pt-3">
          {children}
        </main>
      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto w-full max-w-md px-3 pb-3">
          <div className="overflow-hidden rounded-[26px] border border-black/10 bg-white/95 shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="grid grid-cols-4">
              {TABS.map((t) => {
                const active = isActive(pathname, t.href);

                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={clsx(
                      "flex min-h-[62px] items-center justify-center px-1 text-center text-[11px] font-extrabold transition",
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 active:bg-gray-50"
                    )}
                  >
                    <span className="leading-tight">{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}