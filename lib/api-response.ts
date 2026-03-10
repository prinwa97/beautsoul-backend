// /lib/api-response.ts

import { NextResponse } from "next/server";

export function ok<T extends Record<string, unknown>>(data?: T, status = 200) {
  return NextResponse.json({ ok: true, ...(data || {}) }, { status });
}

export function created<T extends Record<string, unknown>>(data?: T) {
  return NextResponse.json({ ok: true, ...(data || {}) }, { status: 201 });
}