// app/not-found.tsx
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Page not found</h1>
      <p style={{ marginTop: 10, color: "#555" }}>The page you’re looking for doesn’t exist.</p>
      <div style={{ marginTop: 14 }}>
        <Link href="/" style={{ color: "#2563eb" }}>
          Go to Home
        </Link>
      </div>
    </div>
  );
}