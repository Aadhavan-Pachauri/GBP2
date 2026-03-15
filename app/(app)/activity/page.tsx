"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { bytes, dt } from "@/lib/format";

type ActivityRow = {
  version_id: string;
  created_at: number;
  size: number;
  content_type?: string | null;
  device_id?: string | null;
  item_id: string;
  logical_path: string;
};

export default function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = (await apiFetch("/activity?limit=200")) as ActivityRow[];
      setRows(res);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="h1">Activity</div>
          <div className="muted">Everything your server has ingested.</div>
        </div>
        <button className="btn primary" onClick={load} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error ? (
        <div className="card padded" style={{ borderColor: "rgba(239,68,68,0.5)", boxShadow: "none" }}>
          <div className="h2">Error</div>
          <div className="muted2">{error}</div>
        </div>
      ) : null}
      <div className="card padded">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Path</th>
                <th>When</th>
                <th>Size</th>
                <th>Device</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.version_id}>
                  <td className="mono" style={{ maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.logical_path}
                  </td>
                  <td className="muted2">{dt(r.created_at)}</td>
                  <td className="muted2">{bytes(r.size)}</td>
                  <td className="muted2 mono">{r.device_id || "ui"}</td>
                  <td className="muted2 mono">{r.version_id}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="muted2">
                    No activity yet.
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
