"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { bytes, dt } from "@/lib/format";

type SearchItem = { id: string; logical_path: string; updated_at: number; size?: number | null; content_type?: string | null };
type SearchVault = { id: string; domain: string; label: string; updated_at: number };

type SearchResponse = { items: SearchItem[]; vault: SearchVault[] };

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 180);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<SearchResponse>({ items: [], vault: [] });
  const [active, setActive] = useState<{ section: "items" | "vault"; index: number } | null>(null);

  const flat = useMemo(() => {
    const out: { section: "items" | "vault"; index: number }[] = [];
    for (let i = 0; i < res.items.length; i++) out.push({ section: "items", index: i });
    for (let i = 0; i < res.vault.length; i++) out.push({ section: "vault", index: i });
    return out;
  }, [res.items.length, res.vault.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmd = isMac() ? e.metaKey : e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQ("");
      setRes({ items: [], vault: [] });
      setErr(null);
      setBusy(false);
      setActive(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!dq) {
      setRes({ items: [], vault: [] });
      setErr(null);
      setBusy(false);
      setActive(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setErr(null);
    apiFetch(`/search?q=${encodeURIComponent(dq)}&limit=8`)
      .then((r: any) => {
        if (cancelled) return;
        setRes(r as SearchResponse);
        const first = (r.items?.length ? { section: "items", index: 0 } : r.vault?.length ? { section: "vault", index: 0 } : null) as any;
        setActive(first);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setErr(`${e.status || ""} ${e.message || "Search failed"}`.trim());
        setRes({ items: [], vault: [] });
        setActive(null);
      })
      .finally(() => {
        if (cancelled) return;
        setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dq, open]);

  function move(delta: number) {
    if (!flat.length) return;
    const curIdx = active ? flat.findIndex((x) => x.section === active.section && x.index === active.index) : -1;
    const nextIdx = curIdx === -1 ? 0 : (curIdx + delta + flat.length) % flat.length;
    setActive(flat[nextIdx] || null);
  }

  function go(sel: { section: "items" | "vault"; index: number }) {
    if (sel.section === "items") {
      const it = res.items[sel.index];
      if (!it) return;
      setOpen(false);
      router.push(`/library/item/${encodeURIComponent(it.id)}`);
      return;
    }
    const v = res.vault[sel.index];
    if (!v) return;
    setOpen(false);
    router.push(`/vault?open=${encodeURIComponent(v.id)}`);
  }

  if (!open) return null;

  const hint = `${isMac() ? "⌘" : "Ctrl"}K`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "start center",
        padding: 16,
        zIndex: 100
      }}
    >
      <div className="cmdk" onClick={(e) => e.stopPropagation()} style={{ width: "min(980px, 100%)", marginTop: 56 }}>
        <div className="cmdkHead">
          <input
            ref={inputRef}
            className="cmdkInput"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search everything: files, passwords…"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                move(+1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (active) go(active);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <div className="cmdkHint">{busy ? "Searching…" : hint}</div>
        </div>

        {err ? <div className="cmdkErr">{err}</div> : null}

        <div className="cmdkBody">
          <Section
            title="Library"
            empty={!dq ? "Start typing to search." : busy ? "Searching…" : "No matching files."}
            rows={res.items.map((it) => ({
              key: it.id,
              title: it.logical_path.split("/").pop() || it.logical_path,
              subtitle: it.logical_path,
              meta: `${bytes(it.size || 0)} • ${dt(it.updated_at)}`
            }))}
            active={active?.section === "items" ? active.index : null}
            onPick={(idx) => go({ section: "items", index: idx })}
            onHover={(idx) => setActive({ section: "items", index: idx })}
          />

          <Section
            title="Passwords"
            empty={!dq ? "" : busy ? "" : "No matching vault entries."}
            rows={res.vault.map((v) => ({ key: v.id, title: v.label, subtitle: v.domain, meta: dt(v.updated_at) }))}
            active={active?.section === "vault" ? active.index : null}
            onPick={(idx) => go({ section: "vault", index: idx })}
            onHover={(idx) => setActive({ section: "vault", index: idx })}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  empty,
  active,
  onPick,
  onHover
}: {
  title: string;
  rows: { key: string; title: string; subtitle: string; meta: string }[];
  empty: string;
  active: number | null;
  onPick: (idx: number) => void;
  onHover: (idx: number) => void;
}) {
  return (
    <div className="cmdkSection">
      <div className="cmdkSectionTitle">{title}</div>
      <div className="cmdkList">
        {rows.map((r, idx) => (
          <button
            key={r.key}
            className="cmdkRow"
            data-active={active === idx ? "1" : "0"}
            onMouseEnter={() => onHover(idx)}
            onClick={() => onPick(idx)}
          >
            <div style={{ minWidth: 0 }}>
              <div className="cmdkRowTitle">{r.title}</div>
              <div className="cmdkRowSub">{r.subtitle}</div>
            </div>
            <div className="cmdkRowMeta">{r.meta}</div>
          </button>
        ))}
        {!rows.length && empty ? <div className="cmdkEmpty">{empty}</div> : null}
      </div>
    </div>
  );
}

