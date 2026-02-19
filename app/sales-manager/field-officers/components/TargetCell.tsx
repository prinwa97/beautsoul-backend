"use client";

import { useState } from "react";

function nextMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TargetCell({
  foId,
  initialValue,
  thisMonthTarget,
}: any) {
  const [val, setVal] = useState(initialValue || "");
  const [locked, setLocked] = useState(!!initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");

    const num = Number(val);

    if (!Number.isFinite(num) || num <= 0) {
      setError("Enter valid target");
      return;
    }

    // ✅ Rule: next target >= this month target
    if (Number(thisMonthTarget || 0) > 0 && num < Number(thisMonthTarget)) {
      setError(`Min allowed ₹${thisMonthTarget}`);
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      const res = await fetch(
        "/api/sales-manager/field-officers/set-target",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foUserId: foId,
            monthKey: nextMonthKey(),
            targetValue: num,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (data?.ok) {
        setLocked(true);
      } else {
        setError(data?.error || "Failed to save");
      }
    } catch {
      setError("Network error");
    }

    setSaving(false);
  }

  if (locked) {
    return (
      <div className="font-extrabold text-green-700">
        ₹{val} 🔒
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-24 rounded border px-2 py-1 text-sm"
          placeholder="Target"
        />

        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      </div>

      {thisMonthTarget > 0 && (
        <div className="text-[11px] text-black/50">
          This month: ₹{thisMonthTarget}
        </div>
      )}

      {!!error && (
        <div className="text-[11px] font-bold text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}