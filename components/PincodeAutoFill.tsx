"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  pincode: string;
  setPincode: (v: string) => void;

  city: string;
  setCity: (v: string) => void;

  district: string;
  setDistrict: (v: string) => void;

  state: string;
  setState: (v: string) => void;

  disabled?: boolean;
};

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

export default function PincodeAutoFill(props: Props) {
  const {
    pincode,
    setPincode,
    city,
    setCity,
    district,
    setDistrict,
    state,
    setState,
    disabled,
  } = props;

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const lastFetched = useRef<string>("");

  useEffect(() => {
    const pin = onlyDigits(pincode);
    if (pin.length !== 6) {
      setMsg(null);
      return;
    }
    if (lastFetched.current === pin) return;

    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/pincode/${pin}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok || !data?.ok) {
          setMsg("Pincode not found. Please enter manually.");
          return;
        }

        lastFetched.current = pin;

        // ✅ auto-fill only if empty OR same as before
        if (!city) setCity(data.city || "");
        if (!district) setDistrict(data.district || "");
        if (!state) setState(data.state || "");

        setMsg(data?.postOffice ? `Found: ${data.postOffice}` : "Pincode matched");
      } catch {
        if (!alive) return;
        setMsg("Network error. Please enter manually.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [pincode, city, district, state, setCity, setDistrict, setState]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div>
        <label className="text-xs font-semibold text-gray-700">Pincode</label>
        <input
          value={pincode}
          disabled={disabled}
          onChange={(e) => setPincode(onlyDigits(e.target.value).slice(0, 6))}
          placeholder="6-digit pincode"
          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
        <div className="mt-1 text-[11px] text-gray-500">
          {loading ? "Checking pincode..." : msg || "Enter pincode to auto-fill"}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700">City</label>
        <input
          value={city}
          disabled={disabled}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Auto from pincode"
          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700">District</label>
        <input
          value={district}
          disabled={disabled}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="Auto from pincode"
          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700">State</label>
        <input
          value={state}
          disabled={disabled}
          onChange={(e) => setState(e.target.value)}
          placeholder="Auto from pincode"
          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>
    </div>
  );
}
