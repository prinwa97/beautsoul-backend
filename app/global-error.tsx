"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", margin: 0 }}>
        <div style={{ padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Something went wrong</h1>

          <p style={{ marginTop: 10, color: "#555", lineHeight: 1.4 }}>
            Please try again. If this keeps happening, contact admin.
          </p>

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>

            <a
              href="/"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "#16a34a",
                color: "white",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Go Home
            </a>
          </div>

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", color: "#444", fontWeight: 700 }}>Error details</summary>
            <pre
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: "rgba(0,0,0,0.05)",
                overflowX: "auto",
                fontSize: 12,
              }}
            >
              {String(error?.message || "Unknown error")}
              {error?.digest ? `\nDigest: ${error.digest}` : ""}
            </pre>
          </details>
        </div>
      </body>
    </html>
  );
}