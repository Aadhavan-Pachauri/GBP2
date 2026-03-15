export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 24 }}>
      <div className="card padded" style={{ maxWidth: 560, margin: "90px auto" }}>
        {children}
      </div>
      <div className="muted2" style={{ textAlign: "center", marginTop: 16 }}>
        Self-hosted. Your data stays on your server.
      </div>
    </div>
  );
}

