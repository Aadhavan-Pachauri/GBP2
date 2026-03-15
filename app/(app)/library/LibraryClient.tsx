"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, apiFetchResponse } from "@/lib/api";
import { bytes, dt } from "@/lib/format";

type Item = {
  id: string;
  logical_path: string;
  updated_at: number;
  latest_version?: { id: string; size: number; created_at: number; content_type?: string | null } | null;
};

function extOf(path: string) {
  const base = path.split("/").pop() || path;
  const i = base.lastIndexOf(".");
  return i === -1 ? "" : base.slice(i + 1).toLowerCase();
}

function kindOf(it: Item): "photo" | "video" | "audio" | "doc" | "archive" | "code" | "other" {
  const ct = (it.latest_version as any)?.content_type || "";
  if (ct.startsWith("image/")) return "photo";
  if (ct.startsWith("video/")) return "video";
  if (ct.startsWith("audio/")) return "audio";
  const ext = extOf(it.logical_path);
  if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "md"].includes(ext)) return "doc";
  if (["zip", "7z", "rar", "tar", "gz"].includes(ext)) return "archive";
  if (["js", "ts", "tsx", "py", "go", "rs", "java", "c", "cpp", "h", "cs", "rb", "php", "json", "yaml", "yml"].includes(ext)) return "code";
  return "other";
}

function kindEmoji(k: string) {
  if (k === "photo") return "🖼";
  if (k === "video") return "🎬";
  if (k === "audio") return "🎵";
  if (k === "doc") return "📄";
  if (k === "archive") return "🗜";
  if (k === "code") return "⌘";
  return "▦";
}

export default function LibraryClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [kind, setKind] = useState(sp.get("k") || "all");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (kind && kind !== "all") params.set("k", kind);
    const qs = params.toString();
    router.replace(qs ? `/library?${qs}` : "/library");
  }, [query, kind, router]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const url = `/items?limit=500` + (query ? `&q=${encodeURIComponent(query)}` : "");
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

  const filtered = useMemo(() => {
    if (!items.length) return [];
    if (!kind || kind === "all") return items;
    return items.filter((it) => kindOf(it) === kind);
  }, [items, kind]);

  async function downloadItem(it: Item) {
    const filename = (it.logical_path.split("/").pop() || "download").trim() || "download";
    try {
      const res = await apiFetchResponse(`/items/${it.id}/download`);
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

  const kinds = [
    { k: "all", label: "All" },
    { k: "photo", label: "Photos" },
    { k: "doc", label: "Docs" },
    { k: "video", label: "Videos" },
    { k: "audio", label: "Audio" },
    { k: "code", label: "Code" },
    { k: "archive", label: "Archives" }
  ];

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="h1">Library</div>
          <div className="muted">A search-first view of everything you’ve saved.</div>
        </div>
        <button className="btn primary" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="card padded" style={{ boxShadow: "none" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row" style={{ gap: 8 }}>
            {kinds.map((x) => (
              <button
                key={x.k}
                className="btn"
                style={{
                  borderColor: kind === x.k ? "rgba(124,58,237,0.55)" : undefined,
                  background: kind === x.k ? "rgba(124,58,237,0.12)" : undefined
                }}
                onClick={() => setKind(x.k)}
              >
                {x.label}
              </button>
            ))}
          </div>
          <div className="muted2">{busy ? "…" : `${filtered.length} items`}</div>
        </div>
        <div style={{ height: 12 }} />
        <div className="row">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search by name/path…" style={{ minWidth: 360 }} />
          <button className="btn" onClick={load} disabled={busy}>
            Search
          </button>
          <span className="pill muted2">
            Tip: <span className="mono">Ctrl/⌘ K</span> searches files + passwords.
          </span>
        </div>
        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="grid auto">
        {filtered.slice(0, 180).map((it) => {
          const name = it.logical_path.split("/").pop() || it.logical_path;
          const k = kindOf(it);
          return (
            <div
              key={it.id}
              className="card padded"
              style={{ boxShadow: "none", cursor: "pointer" }}
              onClick={() => router.push(`/library/item/${encodeURIComponent(it.id)}`)}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  <span className="navIcon" style={{ width: 40, height: 40, borderRadius: 14 }}>
                    {kindEmoji(k)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="h2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </div>
                    <div className="muted2 mono" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.logical_path}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ height: 10 }} />
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="pill muted2">{bytes(it.latest_version?.size ?? 0)}</span>
                <span className="pill muted2">{dt(it.updated_at)}</span>
              </div>
              <div style={{ height: 10 }} />
              <div className="row">
                <button
                  className="btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadItem(it);
                  }}
                >
                  Download
                </button>
                <button
                  className="btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/library/item/${encodeURIComponent(it.id)}#share`);
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          );
        })}
        {!filtered.length && !busy ? (
          <div className="card padded" style={{ gridColumn: "1 / -1", boxShadow: "none" }}>
            <div className="h2">No items yet</div>
            <div className="muted2">Upload something or start an agent/device sync.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
