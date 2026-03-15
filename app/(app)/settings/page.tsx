"use client";

import { useEffect, useState } from "react";
import { apiFetch, getApiBase, setApiBaseOverride } from "@/lib/api";

export default function SettingsPage() {
  const [apiBase, setApiBase] = useState("");
  const [health, setHealth] = useState<"unknown" | "ok" | "fail">("unknown");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setApiBase(getApiBase());
  }, []);

  async function testHealth(base?: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/health");
      setHealth("ok");
    } catch (e: any) {
      setHealth("fail");
      setError(`${e.status || ""} ${e.message || "Health failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col">
      <div>
        <div className="h1">Settings</div>
        <div className="muted">Client settings (does not change server settings).</div>
      </div>

      <div className="card padded">
        <div className="h2">API base</div>
        <div className="muted2" style={{ marginTop: 6 }}>
          Use this when your ngrok URL changes. Stored locally in the browser/device.
        </div>
        <div style={{ height: 12 }} />
        <div className="row">
          <input className="input" value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
          <button
            className="btn primary"
            onClick={() => {
              setApiBaseOverride(apiBase);
              location.reload();
            }}
          >
            Save
          </button>
          <button className="btn" onClick={() => testHealth()} disabled={busy}>
            {busy ? "Testing…" : "Test"}
          </button>
          <span className="pill" style={{ fontSize: 12 }}>
            {health === "unknown" ? "not tested" : health === "ok" ? "ok" : "fail"}
          </span>
        </div>
        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="card padded">
        <div className="h2">Roadmap toggles</div>
        <div className="muted2" style={{ marginTop: 6 }}>
          Password vault + AI classification are planned as server-side modules (opt-in).
        </div>
      </div>
    </div>
  );
}

