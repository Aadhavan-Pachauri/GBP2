"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, apiFetchResponse } from "@/lib/api";
import { bytes, dt } from "@/lib/format";

type Item = {
  id: string;
  logical_path: string;
  created_at: number;
  updated_at: number;
  latest_version_id?: string | null;
  latest_version?: { id: string; size: number; created_at: number; content_type?: string | null; device_id?: string | null } | null;
};

type Version = { id: string; created_at: number; size: number; content_type?: string | null; device_id?: string | null; original_mtime?: number | null };

function nameOf(path: string) {
  return (path.split("/").pop() || path).trim() || "item";
}

export default function ItemPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const [item, setItem] = useState<Item | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filename = useMemo(() => (item ? nameOf(item.logical_path) : "download"), [item]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const it = (await apiFetch(`/items/${encodeURIComponent(id)}`)) as Item;
      const vs = (await apiFetch(`/items/${encodeURIComponent(id)}/versions`)) as Version[];
      setItem(it);
      setVersions(vs);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function downloadLatest() {
    try {
      const res = await apiFetchResponse(`/items/${encodeURIComponent(id)}/download`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`${e.status || ""} ${e.message || "Download failed"}`.trim());
    }
  }

  async function downloadVersion(versionId: string) {
    try {
      const res = await apiFetchResponse(`/items/versions/${encodeURIComponent(versionId)}/download`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`${e.status || ""} ${e.message || "Download failed"}`.trim());
    }
  }

  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePass, setSharePass] = useState("");
  const [shareDays, setShareDays] = useState("7");

  async function createShare() {
    setShareBusy(true);
    try {
      const days = Math.max(0, Math.min(parseInt(shareDays || "0", 10) || 0, 3650));
      const expires_at = days ? Math.floor(Date.now() / 1000) + days * 24 * 3600 : null;
      const body: any = { item_id: id };
      if (expires_at) body.expires_at = expires_at;
      if (sharePass.trim()) body.password = sharePass.trim();
      const r = (await apiFetch("/shares", { method: "POST", body: JSON.stringify(body) })) as any;
      setShareUrl(r.url || "");
      location.hash = "#share";
    } catch (e: any) {
      alert(`${e.status || ""} ${e.message || "Share failed"}`.trim());
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div style={{ minWidth: 0 }}>
          <div className="h1" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item ? filename : "Item"}
          </div>
          <div className="muted2 mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item?.logical_path || id}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => router.push("/library")}>
            Back
          </button>
          <button className="btn primary" onClick={downloadLatest} disabled={!item}>
            Download
          </button>
          <button className="btn" onClick={load} disabled={busy}>
            {busy ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="card padded" style={{ borderColor: "rgba(239,68,68,0.5)", boxShadow: "none" }}>
          <div className="h2">Error</div>
          <div className="muted2">{error}</div>
        </div>
      ) : null}

      <div className="grid itemGrid">
        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="h2">Version history</div>
          <div className="muted2">Every upload becomes a recoverable version.</div>
          <div style={{ height: 12 }} />
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Size</th>
                  <th>Device</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td className="muted2">{dt(v.created_at)}</td>
                    <td className="muted2">{bytes(v.size)}</td>
                    <td className="muted2 mono">{v.device_id || "ui"}</td>
                    <td>
                      <button className="btn" onClick={() => downloadVersion(v.id)}>
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
                {!versions.length ? (
                  <tr>
                    <td colSpan={4} className="muted2">
                      No versions.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card padded" id="share" style={{ boxShadow: "none" }}>
          <div className="h2">Share</div>
          <div className="muted2">Give access to this item only.</div>
          <div style={{ height: 12 }} />
          <div className="col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="muted2">Expires</div>
              <input className="input" value={shareDays} onChange={(e) => setShareDays(e.target.value)} style={{ width: 120, minWidth: 120 }} />
              <div className="muted2">days (0 = never)</div>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="muted2">Password</div>
              <input className="input" value={sharePass} onChange={(e) => setSharePass(e.target.value)} placeholder="optional" style={{ flex: 1, minWidth: 220 }} />
            </div>
            <button className="btn primary" onClick={createShare} disabled={shareBusy}>
              {shareBusy ? "Creating…" : "Create link"}
            </button>
            {shareUrl ? (
              <div className="card padded" style={{ boxShadow: "none" }}>
                <div className="muted2" style={{ fontSize: 12 }}>
                  Share URL
                </div>
                <div className="mono" style={{ marginTop: 6, wordBreak: "break-all" }}>
                  {shareUrl}
                </div>
                <div style={{ height: 10 }} />
                <div className="row">
                  <button
                    className="btn"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl).catch(() => {});
                    }}
                  >
                    Copy
                  </button>
                  <button className="btn" onClick={() => window.open(shareUrl, "_blank")}>
                    Open
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
