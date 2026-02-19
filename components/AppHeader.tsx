"use client";

import React from "react";
import Image from "next/image";

type AppHeaderProps = {
  titleRow?: React.ReactNode;
  right?: React.ReactNode;
  nav?: React.ReactNode;
  className?: string;

  // ✅ NEW (optional) - logo size control from layout if needed
  logoClassName?: string;
  logoWrapClassName?: string;

  // ✅ NEW (optional) - if you ever want to show tagline on some pages
  subtitleRow?: React.ReactNode;
};

export default function AppHeader({
  titleRow,
  right,
  nav,
  className,
  logoClassName,
  logoWrapClassName,
  subtitleRow,
}: AppHeaderProps) {
  return (
    <header
      className={[
        "sticky top-0 z-40",
        "bg-gradient-to-b from-[#fff3f2] via-white to-white",
        "border-b border-pink-100/70",
        className || "",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 pb-4">
        {/* Card Shell */}
        <div className="rounded-2xl bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)] border border-pink-100/60">
          <div className="px-4 md:px-5 py-4 flex flex-col gap-3">
            {/* TOP ROW */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* LEFT AREA */}
              <div className="flex items-center gap-4 min-w-0">
                {/* ✅ Bigger Logo plate */}
                <div
                  className={[
                    "rounded-2xl bg-[#fff7f6] border border-pink-100/70",
                    "px-4 py-3",
                    logoWrapClassName || "",
                  ].join(" ")}
                >
                  <Image
                    src="/beautsoul-logo.png"
                    alt="BeautSoul"
                    width={320}
                    height={96}
                    priority
                    unoptimized
                    className={[
                      "w-auto object-contain",
                      // ✅ default bigger than before
                      logoClassName || "h-12 md:h-14",
                    ].join(" ")}
                  />
                </div>

                {/* Title + optional subtitle */}
                <div className="min-w-0 flex-1">
                  {/* Title row injected by panel */}
                  {titleRow ? <div className="min-w-0">{titleRow}</div> : null}

                  {/* ✅ Tagline removed by default (only show if subtitleRow provided) */}
                  {subtitleRow ? (
                    <div className="mt-1 text-sm text-gray-600">{subtitleRow}</div>
                  ) : null}
                </div>
              </div>

              {/* RIGHT */}
              {right ? <div className="flex items-center justify-end">{right}</div> : null}
            </div>

            {/* NAV */}
            {nav ? (
              <div className="pt-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {nav}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}