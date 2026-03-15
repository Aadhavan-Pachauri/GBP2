"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, apiFetchResponse } from "@/lib/api";
import { bytes, dt } from "@/lib/format";

type Item = {
  id: string;
  logical_path: string;
  updated_at: number;
  latest_version?: { id: string; size: number; created_at: number } | null;
};

export default function FilesPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [prefix, setPrefix] = useState(sp.get("p") || "");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareFor, setShareFor] = useState<Item | null>(null);
  const [versionsFor, setVersionsFor] = useState<Item | null>(null);

  const query = useMemo(() => q.trim(), [q]);
  const prefixNorm = useMemo(() => (prefix.trim() ? prefix.trim().replace(/^\/+/, "") : ""), [prefix]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const url =
        `/items?limit=500` +
        (prefixNorm ? `&prefix=${encodeURIComponent(prefixNorm)}` : "") +
        (query ? `&q=${encodeURIComponent(query)}` : "");
      const res = (await apiFetch(url)) as Item[];
      setItems(res);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = prefixNorm || "";
    const params = new URLSearchParams();
    if (p) params.set("p", p);
    if (query) params.set("q", query);
    const qs = params.toString();
    router.replace(qs ? `/files?${qs}` : "/files");
  }, [prefixNorm, query, router]);

  async function downloadUrl(path: string, filename: string) {
    try {
      const res = await apiFetchResponse(path);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`${e.status || ""} ${e.message || "Download failed"}`.trim());
    }
  }

  function setPrefixTo(p: string) {
    setPrefix(p);
  }

  type Entry = { kind: "folder"; name: string; nextPrefix: string } | { kind: "file"; name: string; item: Item };

  const entries: Entry[] = useMemo(() => {
    const folders = new Map<string, string>();
    const files: Entry[] = [];
    const p = prefixNorm;
    for (const it of items) {
      if (p && !it.logical_path.startsWith(p)) continue;
      const rest = p ? it.logical_path.slice(p.length) : it.logical_path;
      if (!rest) continue;
      const slash = rest.indexOf("/");
      if (slash !== -1) {
        const folderName = rest.slice(0, slash);
        const next = p ? `${p}${folderName}/` : `${folderName}/`;
        folders.set(folderName, next);
      } else {
        files.push({ kind: "file", name: rest, item: it });
      }
    }
    const folderEntries: Entry[] = [...folders.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, nextPrefix]) => ({ kind: "folder", name, nextPrefix }));
    files.sort((a, b) => (a as any).name.localeCompare((b as any).name));
    return [...folderEntries, ...files];
  }, [items, prefixNorm]);

  const crumbs = useMemo(() => {
    const p = prefixNorm.replace(/\/+$/, "");
    if (!p) return [];
    const parts = p.split("/").filter(Boolean);
    const out: { label: string; prefix: string }[] = [];
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}${part}/` : `${part}/`;
      out.push({ label: part, prefix: cur });
    }
    return out;
  }, [prefixNorm]);

  function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "grid",
          placeItems: "center",
          padding: 16,
          zIndex: 50
        }}
      >
        <div className="card padded" onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 100%)" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="h2">{title}</div>
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>
          <div style={{ height: 12 }} />
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="h1">Files</div>
          <div className="muted">Fast explorer over your indexed logical paths.</div>
        </div>
        <button className="btn primary" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="card padded">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <span className="pill" style={{ cursor: "pointer" }} onClick={() => setPrefixTo("")} title="Root">
              Root
            </span>
            {crumbs.map((c, idx) => (
              <span
                key={idx}
                className="pill mono"
                style={{ cursor: "pointer" }}
                onClick={() => setPrefixTo(c.prefix)}
                title={c.prefix}
              >
                {c.label}
              </span>
            ))}
            {prefixNorm ? <span className="muted2 mono">{prefixNorm}</span> : null}
          </div>
          <div className="muted2">{busy ? "…" : `${entries.length} entries`}</div>
        </div>

        <div style={{ height: 12 }} />
        <div className="row">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search (contains)…" />
          <button className="btn" onClick={load} disabled={busy}>
            Search
          </button>
          {prefixNorm ? (
            <button className="btn" onClick={() => setPrefixTo("")}>
              Clear folder
            </button>
          ) : null}
        </div>

        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}

        <div style={{ height: 12 }} />
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Updated</th>
                <th>Size</th>
                <th style={{ width: 340 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) =>
                e.kind === "folder" ? (
                  <tr key={`d:${e.nextPrefix}`}>
                    <td className="mono" style={{ cursor: "pointer" }} onClick={() => setPrefixTo(e.nextPrefix)}>
                      📁 {e.name}/
                    </td>
                    <td className="muted2">—</td>
                    <td className="muted2">—</td>
                    <td>
                      <button className="btn" onClick={() => setPrefixTo(e.nextPrefix)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.item.id}>
                    <td className="mono">📄 {e.name}</td>
                    <td className="muted2">{dt(e.item.updated_at)}</td>
                    <td className="muted2">{bytes(e.item.latest_version?.size ?? 0)}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          className="btn"
                          onClick={() => downloadUrl(`/items/${e.item.id}/download`, e.name)}
                          title="Download latest"
                        >
                          Download
                        </button>
                        <button className="btn" onClick={() => setVersionsFor(e.item)} title="View version history">
                          Versions
                        </button>
                        <button className="btn" onClick={() => setShareFor(e.item)} title="Create share link">
                          Share
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {!entries.length ? (
                <tr>
                  <td colSpan={4} className="muted2">
                    No files here yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {shareFor ? (
        <Modal title={`Share: ${shareFor.logical_path}`} onClose={() => setShareFor(null)}>
          <ShareModal item={shareFor} />
        </Modal>
      ) : null}
      {versionsFor ? (
        <Modal title={`Versions: ${versionsFor.logical_path}`} onClose={() => setVersionsFor(null)}>
          <VersionsModal item={versionsFor} onDownload={downloadUrl} />
        </Modal>
      ) : null}
    </div>
  );
}

function ShareModal({ item }: { item: Item }) {
  const [expiresHours, setExpiresHours] = useState("24");
  const [password, setPassword] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    setCreatedUrl(null);
    const h = parseInt(expiresHours, 10);
    const expires_at = Number.isFinite(h) && h > 0 ? Math.floor(Date.now() / 1000) + h * 3600 : null;
    try {
      const res = (await apiFetch("/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          expires_at,
          password: password.trim() ? password : null
        })
      })) as any;
      setCreatedUrl(res.url);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col">
      <div className="row">
        <input className="input" value={expiresHours} onChange={(e) => setExpiresHours(e.target.value)} placeholder="expires hours" />
        <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (optional)" />
        <button className="btn primary" onClick={create} disabled={busy}>
          {busy ? "…" : "Create"}
        </button>
      </div>
      {createdUrl ? (
        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="muted2">Share URL</div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 680 }}>
              {createdUrl}
            </div>
            <button className="btn" onClick={() => navigator.clipboard.writeText(createdUrl)}>
              Copy
            </button>
          </div>
        </div>
      ) : null}
      {error ? <div style={{ color: "var(--danger)" }}>{error}</div> : null}
      <div className="muted2">Tip: set `SHARE_BASE_URL` in `backend/.env` to your ngrok URL for correct links.</div>
    </div>
  );
}

function VersionsModal({
  item,
  onDownload
}: {
  item: Item;
  onDownload: (path: string, filename: string) => Promise<void>;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = (await apiFetch(`/items/${item.id}/versions`)) as any[];
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

  const filename = item.logical_path.split("/").pop() || "download";

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="muted2">{busy ? "Loading…" : `${rows.length} versions`}</div>
        <button className="btn" onClick={load} disabled={busy}>
          Refresh
        </button>
      </div>
      {error ? <div style={{ color: "var(--danger)" }}>{error}</div> : null}
      <div className="card padded" style={{ boxShadow: "none" }}>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Size</th>
                <th>Device</th>
                <th>Version</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted2">{dt(r.created_at)}</td>
                  <td className="muted2">{bytes(r.size)}</td>
                  <td className="muted2 mono">{r.device_id || "ui"}</td>
                  <td className="muted2 mono">{r.id}</td>
                  <td>
                    <button className="btn" onClick={() => onDownload(`/items/versions/${r.id}/download`, filename)}>
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="muted2">
                    No versions yet.
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
