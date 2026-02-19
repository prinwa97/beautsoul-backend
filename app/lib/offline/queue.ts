"use client";

import { v4 as uuid } from "uuid";
import { getOfflineDB, type OfflineJob } from "./db";

function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function enqueueJob(input: Omit<OfflineJob, "id" | "createdAt" | "tries">) {
  const db = await getOfflineDB();
  const job: OfflineJob = {
    id: uuid(),
    createdAt: Date.now(),
    tries: 0,
    ...input,
  };
  await db.put("jobs", job);
  return job;
}

export async function getPendingCount() {
  const db = await getOfflineDB();
  const keys = await db.getAllKeys("jobs");
  return keys.length;
}

async function sendJob(job: OfflineJob) {
  const res = await fetch(job.url, {
    method: job.method,
    headers: { "content-type": "application/json", ...(job.headers || {}) },
    body: JSON.stringify(job.body ?? {}),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || (data && data.ok === false)) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function syncNow(opts?: { max?: number }) {
  if (!isOnline()) return { ok: false as const, synced: 0, error: "Offline" };

  const max = opts?.max ?? 25;

  const db = await getOfflineDB();
  const all = await db.getAllFromIndex("jobs", "by-createdAt"); // oldest first
  const jobs = all.slice(0, max);

  let synced = 0;

  for (const job of jobs) {
    try {
      await sendJob(job);
      await db.delete("jobs", job.id);
      synced += 1;
    } catch (e: any) {
      // increment tries + store error (leave in queue)
      const tries = (job.tries || 0) + 1;
      await db.put("jobs", { ...job, tries, lastError: e?.message || "Failed" });

      // safety: if too many tries, stop this run (avoid loop)
      if (tries >= 5) {
        // keep it, but stop so user can fix (auth, validation, etc.)
        break;
      }
    }
  }

  return { ok: true as const, synced };
}

/**
 * Smart call:
 * - if online: try send
 * - if offline OR send fails due to network: enqueue
 */
export async function postOrQueue(args: {
  type: OfflineJob["type"];
  url: string;
  body: any;
  headers?: Record<string, string>;
}) {
  // add idempotencyKey (very important)
  const idempotencyKey = args.body?.idempotencyKey || uuid();
  const body = { ...args.body, idempotencyKey };

  if (isOnline()) {
    try {
      const res = await fetch(args.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(args.headers || {}) },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok !== false) return { ok: true as const, mode: "online" as const, data };

      // if server rejected (validation), DON'T enqueue
      return { ok: false as const, mode: "online" as const, error: data?.error || `HTTP ${res.status}` };
    } catch (e: any) {
      // network-ish -> queue
      const job = await enqueueJob({ type: args.type, url: args.url, method: "POST", body, headers: args.headers });
      return { ok: true as const, mode: "queued" as const, jobId: job.id };
    }
  }

  const job = await enqueueJob({ type: args.type, url: args.url, method: "POST", body, headers: args.headers });
  return { ok: true as const, mode: "queued" as const, jobId: job.id };
}