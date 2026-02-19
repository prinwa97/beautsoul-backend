"use client";

import React, { useEffect, useMemo } from "react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ open, title, onClose, children }: Props) {
  // lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sheetStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      background: "white",
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      border: "1px solid #e9ecf3",
      boxShadow: "0 -18px 60px rgba(0,0,0,0.25)",
      maxHeight: "86vh",
      display: "flex",
      flexDirection: "column",
      transform: open ? "translateY(0)" : "translateY(105%)",
      transition: "transform 220ms ease",
      willChange: "transform",
      overflow: "hidden",
    }),
    [open]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{ ...sheetStyle, width: "min(720px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #eef1f7",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 950,
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title || "Details"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #e4e6ef",
              background: "white",
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Close ✕
          </button>
        </div>

        <div style={{ padding: 12, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
