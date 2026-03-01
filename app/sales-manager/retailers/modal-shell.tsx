"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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

  useEffect(() => setMounted(true), []);

  // lock background scroll + ESC close
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const ui = useMemo(() => {
    if (!open) return null;

    return (
      <div className="fixed inset-0" style={{ zIndex }} role="dialog" aria-modal="true">
        {/* overlay */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* ✅ ALWAYS CENTER */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <div
            className={["w-full", widthClass, "rounded-2xl bg-white border shadow-2xl overflow-hidden"].join(" ")}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b flex items-start justify-between gap-3">
              <div className="min-w-0">{titleTop}</div>
              <button
                className="px-3 py-2 rounded-xl border bg-white text-sm font-black hover:bg-gray-50"
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            {/* ✅ Body scroll inside modal */}
            <div className="max-h-[85vh] overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    );
  }, [open, onClose, titleTop, widthClass, zIndex, children]);

  if (!mounted) return null;
  // ✅ Portal to body = no parent transform issues
  return createPortal(ui, document.body);
}