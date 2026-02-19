"use client";
import React from "react";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
  maxLength,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  type?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#222" }}>
        {label} {required ? <span style={{ color: "#b00020" }}>*</span> : null}
      </div>
      <input
        type={type || "text"}
        value={value}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #ddd",
          outline: "none",
          fontSize: 14,
        }}
      />
    </div>
  );
}
