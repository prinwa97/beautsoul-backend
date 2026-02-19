"use client";

import { useEffect, useState } from "react";
import { getPendingCount, syncNow } from "./queue";

export function useOfflineSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    setPending(await getPendingCount());
  }

  async function runSync() {
    setSyncing(true);
    setMsg("");
    try {
      const r = await syncNow({ max: 50 });
      if (!r.ok) setMsg(r.error || "Offline");
      await refresh();
      if (r.ok) setMsg(r.synced ? `✅ Synced ${r.synced}` : "Nothing to sync");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    refresh();

    const onOnline = () => runSync();
    window.addEventListener("online", onOnline);

    // also try once at load
    runSync();

    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pending, syncing, msg, refresh, runSync };
}