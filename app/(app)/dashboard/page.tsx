"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { bytes, dt } from "@/lib/format";

type Stats = { items: number; versions: number; blobs: number; bytes: number; devices_active: number };
type ActivityRow = {
  version_id: string;
  created_at: number;
  size: number;
  content_type?: string | null;
  device_id?: string | null;
  item_id: string;
  logical_path: string;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card padded" style={{ boxShadow: "none" }}>
      <div className="muted2" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className="h1">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const s = (await apiFetch("/stats")) as Stats;
      const a = (await apiFetch("/activity?limit=50")) as ActivityRow[];
      setStats(s);
      setActivity(a);
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
          <div className="h1">Dashboard</div>
          <div className="muted">Your server at a glance.</div>
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

      <div className="grid auto">
        <StatCard label="Items" value={stats ? `${stats.items}` : "—"} />
        <StatCard label="Versions" value={stats ? `${stats.versions}` : "—"} />
        <StatCard label="Blobs" value={stats ? `${stats.blobs}` : "—"} />
        <StatCard label="Stored" value={stats ? bytes(stats.bytes) : "—"} />
        <StatCard label="Active devices" value={stats ? `${stats.devices_active}` : "—"} />
      </div>

      <div className="card padded">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h2">Recent activity</div>
            <div className="muted2">Latest uploaded versions.</div>
          </div>
          <span className="pill mono" style={{ fontSize: 12 }}>
            /activity
          </span>
        </div>
        <div style={{ height: 12 }} />
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Path</th>
                <th>When</th>
                <th>Size</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((r) => (
                <tr key={r.version_id}>
                  <td className="mono" style={{ maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.logical_path}
                  </td>
                  <td className="muted2">{dt(r.created_at)}</td>
                  <td className="muted2">{bytes(r.size)}</td>
                  <td className="muted2 mono">{r.device_id || "ui"}</td>
                </tr>
              ))}
              {!activity.length ? (
                <tr>
                  <td colSpan={4} className="muted2">
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
