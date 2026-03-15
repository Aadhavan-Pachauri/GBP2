"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Share = {
  id: string;
  item_id?: string | null;
  version_id?: string | null;
  expires_at?: number | null;
  max_downloads?: number | null;
  downloads_count: number;
  created_at: number;
};

export default function SharesPage() {
  const [shares, setShares] = useState<Share[]>([]);
  const [itemId, setItemId] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = (await apiFetch("/shares")) as Share[];
      setShares(res);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError(null);
    setCreatedUrl(null);
    if (!itemId.trim()) return setError("Provide item_id");
    const h = parseInt(expiresHours, 10);
    const expires_at = Number.isFinite(h) && h > 0 ? Math.floor(Date.now() / 1000) + h * 3600 : null;
    try {
      setBusy(true);
      const res = (await apiFetch("/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId.trim(),
          expires_at,
          password: password.trim() ? password : null
        })
      })) as any;
      setCreatedUrl(res.url);
      await load();
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col">
      <div>
        <div className="h1">Shares</div>
        <div className="muted">Create links to specific files (expiry + optional password).</div>
      </div>

      <div className="card padded">
        <div className="row">
          <input className="input" value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="item_id" />
          <input className="input" value={expiresHours} onChange={(e) => setExpiresHours(e.target.value)} placeholder="expires hours" />
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (optional)" />
          <button className="btn primary" onClick={create} disabled={busy}>
            {busy ? "…" : "Create"}
          </button>
        </div>

        {createdUrl ? (
          <div className="card padded" style={{ marginTop: 12, boxShadow: "none" }}>
            <div className="muted2">Share URL</div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 760 }}>
                {createdUrl}
              </div>
              <button className="btn" onClick={() => navigator.clipboard.writeText(createdUrl)}>
                Copy
              </button>
            </div>
          </div>
        ) : null}

        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="card padded">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="h2">Recent shares</div>
          <span className="pill">{shares.length}</span>
        </div>
        <div style={{ height: 12 }} />
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Share ID</th>
                <th>Item</th>
                <th>Downloads</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.id}</td>
                  <td className="mono muted2">{s.item_id || "-"}</td>
                  <td className="muted2">{s.downloads_count}</td>
                  <td className="muted2">{s.expires_at ? new Date(s.expires_at * 1000).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {!shares.length ? (
                <tr>
                  <td colSpan={4} className="muted2">
                    No shares yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
