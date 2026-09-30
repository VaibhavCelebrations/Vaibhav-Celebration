"use client";

/**
 * Last-resort screen when the root layout itself fails. It replaces the whole document, so it
 * cannot rely on the site's stylesheet, fonts or providers: styles are inline on purpose.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F5F3E6", color: "#212121" }}>
        <main role="alert" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Vaibhav Celebrations is having trouble loading</h1>
          <p style={{ color: "#6b6560", maxWidth: 420, lineHeight: 1.6 }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: "12px 32px", borderRadius: 9999, border: 0, background: "#755846", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 24, fontSize: 12, color: "#8a847e" }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
