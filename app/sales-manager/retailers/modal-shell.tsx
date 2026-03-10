// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/modal-shell.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

let OPEN_MODAL_COUNT = 0;

export default function ModalShell({
  open,
  onClose,
  titleTop,
  widthClass = "max-w-5xl",
  zIndex = 9999,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleTop?: React.ReactNode;
  widthClass?: string;
  zIndex?: number;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // body scroll lock for nested modals
  useEffect(() => {
    if (!open || !mounted) return;

    OPEN_MODAL_COUNT += 1;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      OPEN_MODAL_COUNT = Math.max(0, OPEN_MODAL_COUNT - 1);

      if (OPEN_MODAL_COUNT === 0) {
        html.style.overflow = prevHtmlOverflow;
        body.style.overflow = prevBodyOverflow;
      }
    };
  }, [open, mounted]);

  // ESC close
  useEffect(() => {
    if (!open || !mounted) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, mounted, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* center */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div
          className={[
            "w-full",
            widthClass,
            "rounded-2xl bg-white border shadow-2xl overflow-hidden",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">{titleTop}</div>

            <button
              type="button"
              className="shrink-0 px-3 py-2 rounded-xl border bg-white text-sm font-black hover:bg-gray-50"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* body */}
          <div className="max-h-[85vh] overflow-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}