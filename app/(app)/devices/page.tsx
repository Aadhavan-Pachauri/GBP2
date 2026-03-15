"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Device = { id: string; name: string; created_at: number; last_seen_at?: number | null; revoked_at?: number | null };

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState("laptop-agent");
  const [created, setCreated] = useState<{ device_id: string; device_key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = (await apiFetch("/devices")) as Device[];
      setDevices(res);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError(null);
    setCreated(null);
    try {
      setBusy(true);
      const res = (await apiFetch("/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      })) as any;
      setCreated(res);
      await load();
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      setBusy(true);
      await apiFetch(`/devices/${id}/revoke`, { method: "POST" });
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
        <div className="h1">Devices</div>
        <div className="muted">Issue per-device keys so you can revoke compromised devices instantly.</div>
      </div>

      <div className="card padded">
        <div className="row">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="device name" />
          <button className="btn primary" onClick={create} disabled={busy}>
            Create device key
          </button>
        </div>
        {created ? (
          <div className="card padded" style={{ marginTop: 12, boxShadow: "none" }}>
            <div className="muted2">Save this once (not shown again):</div>
            <div style={{ height: 8 }} />
            <div className="mono">X-Device-Id: {created.device_id}</div>
            <div className="mono">X-Device-Key: {created.device_key}</div>
            <div style={{ height: 10 }} />
            <button className="btn" onClick={() => navigator.clipboard.writeText(`X-Device-Id: ${created.device_id}\nX-Device-Key: ${created.device_key}`)}>
              Copy headers
            </button>
          </div>
        ) : null}
        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="card padded">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="h2">Registered devices</div>
          <span className="pill">{devices.length}</span>
        </div>
        <div style={{ height: 12 }} />
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Device ID</th>
                <th>Last seen</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.name}</td>
                  <td className="mono muted2">{d.id}</td>
                  <td className="muted2">{d.last_seen_at ? new Date(d.last_seen_at * 1000).toLocaleString() : "never"}</td>
                  <td className="muted2">{d.revoked_at ? "revoked" : "active"}</td>
                  <td>
                    {!d.revoked_at ? (
                      <button className="btn danger" onClick={() => revoke(d.id)} disabled={busy}>
                        Revoke
                      </button>
                    ) : (
                      <span className="muted2">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!devices.length ? (
                <tr>
                  <td colSpan={5} className="muted2">
                    No devices yet.
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
