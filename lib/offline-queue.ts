"use client";

/**
 * Offline Queue (client-side)
 * Exports used by FO pages:
 * - enqueueJob
 * - getQueue
 * - getQueueLength
 * - isOnline
 * - makeId
 * - makeIdempotencyKey
 * - runSyncOnce
 */

export type QueueJobKind =
  | "FO_ORDER_SUBMIT"
  | "FO_COLLECT_RETAILER";

export type QueueJob = {
  id: string;
  kind: QueueJobKind;
  createdAt: string; // ISO
  idempotencyKey: string;
  payload: any;
  attempts: number;
  lastError?: string | null;
};

const LS_KEY = "BS_OFFLINE_QUEUE_V1";

function safeParse(raw: string | null): any {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readQueue(): QueueJob[] {
  if (typeof window === "undefined") return [];
  const data = safeParse(localStorage.getItem(LS_KEY));
  return Array.isArray(data) ? data : [];
}

function writeQueue(q: QueueJob[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(q));
  } catch {
    // ignore quota
  }
}

export function getQueue(): QueueJob[] {
  return readQueue();
}

export function getQueueLength(): number {
  return readQueue().length;
}

export function isOnline(): boolean {
  // IMPORTANT: SSR safe
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

export function makeId(prefix = "job"): string {
  // stable-ish id without crypto requirement
  const rnd = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

export function makeIdempotencyKey(kind: string, payload: any): string {
  // deterministic-ish key (same payload => same key) for retry safety
  const base = JSON.stringify({ kind, payload });
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `${kind}_${h.toString(16)}`;
}

export function enqueueJob(input: { kind: QueueJobKind; payload: any; idempotencyKey?: string }) {
  const q = readQueue();
  const id = makeId("q");
  const key = input.idempotencyKey || makeIdempotencyKey(input.kind, input.payload);

  q.push({
    id,
    kind: input.kind,
    payload: input.payload,
    idempotencyKey: key,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  });

  writeQueue(q);
  return { ok: true, id, idempotencyKey: key };
}

function removeJob(jobId: string) {
  const q = readQueue().filter((j) => j.id !== jobId);
  writeQueue(q);
}

function updateJob(jobId: string, patch: Partial<QueueJob>) {
  const q = readQueue().map((j) => (j.id === jobId ? { ...j, ...patch } : j));
  writeQueue(q);
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Idempotency key header (optional if you implement server-side)
      "x-idempotency-key": String(body?.idempotencyKey || ""),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * ✅ Runs one sync pass (processes queue sequentially)
 * Returns summary.
 */
export async function runSyncOnce() {
  if (!isOnline()) {
    return { ok: false, error: "Offline", synced: 0, failed: 0, left: getQueueLength() };
  }

  const q = readQueue();
  let synced = 0;
  let failed = 0;

  for (const job of q) {
    try {
      updateJob(job.id, { attempts: (job.attempts || 0) + 1, lastError: null });

      // Map job -> endpoint
      if (job.kind === "FO_ORDER_SUBMIT") {
        const { res, data } = await postJson("/api/field-officer/orders", {
          ...job.payload,
          idempotencyKey: job.idempotencyKey,
        });
        if (!res.ok) throw new Error(data?.error || `Order sync failed (${res.status})`);
      }

      if (job.kind === "FO_COLLECT_RETAILER") {
        const { res, data } = await postJson("/api/field-officer/collections/collect-retailer", {
          ...job.payload,
          idempotencyKey: job.idempotencyKey,
        });
        if (!res.ok) throw new Error(data?.error || `Collect sync failed (${res.status})`);
      }

      removeJob(job.id);
      synced++;
    } catch (e: any) {
      failed++;
      updateJob(job.id, { lastError: String(e?.message || "Sync error") });
      // keep in queue for next retry
    }
  }

  return { ok: true, synced, failed, left: getQueueLength() };
}
