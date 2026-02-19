"use client";
import React from "react";

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#111", color: "white", border: "1px solid #111" },
    ghost: { background: "white", color: "#111", border: "1px solid #ddd" },
    danger: { background: "#b00020", color: "white", border: "1px solid #b00020" },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 950,
        fontSize: 13,
        ...styles[variant],
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
