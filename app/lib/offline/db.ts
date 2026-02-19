"use client";

import { openDB, type DBSchema } from "idb";

export type OfflineJob = {
  id: string;                 // uuid
  createdAt: number;          // Date.now()
  type: "FO_ORDER_CREATE" | "FO_COLLECTION" | "FO_AUDIT_SUBMIT";
  url: string;                // api endpoint
  method: "POST" | "PATCH";
  body: any;                  // json body
  headers?: Record<string, string>;
  tries: number;              // retry count
  lastError?: string;
};

interface OfflineSchema extends DBSchema {
  jobs: {
    key: string;
    value: OfflineJob;
    indexes: { "by-createdAt": number };
  };
}

const DB_NAME = "bs_offline_v1";
const DB_VER = 1;

export async function getOfflineDB() {
  return openDB<OfflineSchema>(DB_NAME, DB_VER, {
    upgrade(db) {
      const store = db.createObjectStore("jobs", { keyPath: "id" });
      store.createIndex("by-createdAt", "createdAt");
    },
  });
}