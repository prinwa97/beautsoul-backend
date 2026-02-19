import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const all = store.getAll().map((c) => ({
    name: c.name,
    // value intentionally not exposed fully
    valuePreview: (c.value || "").slice(0, 30) + ((c.value || "").length > 30 ? "..." : ""),
  }));

  const session_user = store.get("session_user")?.value || null;
  const sessionUser = store.get("sessionUser")?.value || null;
  const session = store.get("session")?.value || null;
  const token = store.get("token")?.value || null;

  let parsed: any = null;
  try {
    parsed = session_user ? JSON.parse(session_user) : null;
  } catch {
    parsed = null;
  }

  return NextResponse.json({
    ok: true,
    cookieNames: all.map((x) => x.name),
    cookies: all,
    picks: {
      session_user: session_user ? session_user.slice(0, 60) + "..." : null,
      sessionUser: sessionUser ? sessionUser.slice(0, 60) + "..." : null,
      session: session ? session.slice(0, 60) + "..." : null,
      token: token ? token.slice(0, 60) + "..." : null,
    },
    parsedSessionUser: parsed,
  });
}
