"use client";

import React, { useEffect, useState } from "react";
import type { Dist, RoleKey } from "./types";
import CreateUserForm from "./create-user-form";
import UserDetailsPanel from "./user-details-panel";

type ViewKey = "CREATE" | "DETAILS";

export default function SMCreateUserPage() {
  const [view, setView] = useState<ViewKey>("CREATE");
  const [role, setRole] = useState<RoleKey>("RETAILER");

  const [dists, setDists] = useState<Dist[]>([]);
  const [distsLoading, setDistsLoading] = useState(true);
  const [distId, setDistId] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setDistsLoading(true);
      try {
        const res = await fetch(
          "/api/sales-manager/user/distributors/list",
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => null);
        if (!alive) return;

        if (res.ok && data?.ok && Array.isArray(data.distributors)) {
          setDists(data.distributors);
          if (!distId && data.distributors[0]?.id)
            setDistId(data.distributors[0].id);
        } else {
          setDists([]);
        }
      } catch {
        if (!alive) return;
        setDists([]);
      } finally {
        if (!alive) return;
        setDistsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-6">
      {/* ===== Action Buttons ===== */}
      <div className="bg-white border border-pink-100 rounded-2xl p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("CREATE")}
            className={[
              "px-4 py-2 rounded-2xl border text-sm font-black transition",
              view === "CREATE"
                ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                : "bg-white border-pink-200 text-gray-900 hover:bg-[#fff0f0]",
            ].join(" ")}
          >
            User Create
          </button>

          <button
            type="button"
            onClick={() => setView("DETAILS")}
            className={[
              "px-4 py-2 rounded-2xl border text-sm font-black transition",
              view === "DETAILS"
                ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                : "bg-white border-pink-200 text-gray-900 hover:bg-[#fff0f0]",
            ].join(" ")}
          >
            User Detail
          </button>
        </div>

        <div className="mt-1 text-[11px] text-gray-500">
          {view === "CREATE"
            ? "Create new user"
            : "View / Edit / Reset Password"}
        </div>
      </div>

      {/* ===== Body ===== */}
      {view === "CREATE" ? (
        <CreateUserForm
          role={role}
          setRole={setRole}
          dists={dists}
          distsLoading={distsLoading}
          distId={distId}
          setDistId={setDistId}
        />
      ) : (
        <UserDetailsPanel />
      )}
    </div>
  );
}