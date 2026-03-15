"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type DomainRow = { domain: string; count: number };
type VaultSummary = { id: string; domain: string; label: string; updated_at: number };
type VaultPayload = {
  label: string;
  url?: string | null;
  username?: string | null;
  password?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

function dt(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

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
        zIndex: 60
      }}
    >
      <div className="card padded" onClick={(e) => e.stopPropagation()} style={{ width: "min(980px, 100%)" }}>
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

export default function VaultPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<VaultSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const query = useMemo(() => q.trim(), [q]);

  async function loadDomains() {
    const res = (await apiFetch("/vault/domains")) as DomainRow[];
    setDomains(res);
  }

  async function loadItems() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "300");
      if (selectedDomain) params.set("domain", selectedDomain);
      if (query) params.set("q", query);
      const res = (await apiFetch(`/vault/items?${params.toString()}`)) as VaultSummary[];
      setItems(res);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      await loadDomains();
      await loadItems();
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const id = sp.get("open");
    if (id) setOpenItemId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain]);

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="h1">Vault</div>
          <div className="muted">Encrypted-at-rest passwords, autosorted by domain.</div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setImportOpen(true)}>
            Import
          </button>
          <button className="btn primary" onClick={() => setCreateOpen(true)}>
            New
          </button>
          <button className="btn" onClick={refresh} disabled={busy}>
            {busy ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="card padded" style={{ borderColor: "rgba(239,68,68,0.5)", boxShadow: "none" }}>
          <div className="h2">Error</div>
          <div className="muted2">{error}</div>
          <div style={{ height: 8 }} />
          <div className="muted2">
            If this says vault is disabled, set <span className="mono">VAULT_MASTER_PASSWORD</span> in <span className="mono">backend/.env</span> and restart.
          </div>
        </div>
      ) : null}

      <div className="grid vaultGrid">
        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="h2">Domains</div>
          <div className="muted2">Autosort view.</div>
          <div style={{ height: 10 }} />
          <button className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={() => setSelectedDomain("")}>
            All ({domains.reduce((a, d) => a + d.count, 0)})
          </button>
          <div style={{ display: "grid", gap: 8 }}>
            {domains.slice(0, 60).map((d) => (
              <button
                key={d.domain}
                className="btn"
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderColor: selectedDomain === d.domain ? "rgba(124,58,237,0.55)" : undefined
                }}
                onClick={() => setSelectedDomain(d.domain)}
              >
                <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                  <span className="mono" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.domain}
                  </span>
                  <span className="pill">{d.count}</span>
                </div>
              </button>
            ))}
            {!domains.length ? <div className="muted2">No vault items yet.</div> : null}
          </div>
        </div>

        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="h2">Entries</div>
              <div className="muted2">{selectedDomain ? selectedDomain : "All domains"}</div>
            </div>
            <div className="muted2">{busy ? "loading…" : `${items.length} items`}</div>
          </div>
          <div style={{ height: 10 }} />
          <div className="row">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search label…" />
            <button className="btn" onClick={loadItems} disabled={busy}>
              Search
            </button>
          </div>
          <div style={{ height: 12 }} />
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Domain</th>
                  <th>Updated</th>
                  <th style={{ width: 260 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="mono" style={{ maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.label}
                    </td>
                    <td className="muted2 mono">{it.domain}</td>
                    <td className="muted2">{dt(it.updated_at)}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn" onClick={() => setOpenItemId(it.id)}>
                          View
                        </button>
                        <button className="btn" onClick={() => setEditItemId(it.id)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={4} className="muted2">
                      No entries.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openItemId ? (
        <Modal
          title="Vault entry"
          onClose={() => {
            setOpenItemId(null);
            router.replace("/vault");
          }}
        >
          <VaultView itemId={openItemId} />
        </Modal>
      ) : null}
      {editItemId ? (
        <Modal title="Edit entry" onClose={() => setEditItemId(null)}>
          <VaultEdit itemId={editItemId} onDone={() => { setEditItemId(null); refresh(); }} />
        </Modal>
      ) : null}
      {createOpen ? (
        <Modal title="New entry" onClose={() => setCreateOpen(false)}>
          <VaultCreate onDone={() => { setCreateOpen(false); refresh(); }} />
        </Modal>
      ) : null}
      {importOpen ? (
        <Modal title="Import (Bitwarden JSON)" onClose={() => setImportOpen(false)}>
          <VaultImport onDone={() => { setImportOpen(false); refresh(); }} />
        </Modal>
      ) : null}
    </div>
  );
}

function Field({ label, value, onCopy, mono }: { label: string; value?: string | null; onCopy?: () => void; mono?: boolean }) {
  return (
    <div className="card padded" style={{ boxShadow: "none" }}>
      <div className="muted2" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className={mono ? "mono" : ""} style={{ marginTop: 6, wordBreak: "break-word" }}>
        {value || "—"}
      </div>
      {onCopy && value ? (
        <div style={{ height: 10 }} />
      ) : null}
      {onCopy && value ? (
        <button className="btn" onClick={onCopy}>
          Copy
        </button>
      ) : null}
    </div>
  );
}

function VaultView({ itemId }: { itemId: string }) {
  const [data, setData] = useState<VaultPayload | null>(null);
  const [meta, setMeta] = useState<{ domain: string; created_at: number; updated_at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/vault/items/${itemId}`)
      .then((res: any) => {
        setData(res.data);
        setMeta({ domain: res.domain, created_at: res.created_at, updated_at: res.updated_at });
      })
      .catch((e: any) => setError(`${e.status || ""} ${e.message || "Failed"}`.trim()));
  }, [itemId]);

  if (error) return <div style={{ color: "var(--danger)" }}>{error}</div>;
  if (!data || !meta) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      <Field label="Label" value={data.label} mono />
      <Field label="Domain" value={meta.domain} mono />
      <Field label="URL" value={data.url || ""} mono onCopy={() => navigator.clipboard.writeText(data.url || "")} />
      <Field label="Username" value={data.username || ""} mono onCopy={() => navigator.clipboard.writeText(data.username || "")} />
      <Field
        label="Password"
        value={data.password ? "••••••••••" : ""}
        mono
        onCopy={() => navigator.clipboard.writeText(data.password || "")}
      />
      <Field label="Updated" value={dt(meta.updated_at)} />
      <div className="card padded" style={{ gridColumn: "1 / -1", boxShadow: "none" }}>
        <div className="muted2" style={{ fontSize: 12 }}>
          Notes
        </div>
        <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{data.notes || "—"}</div>
      </div>
    </div>
  );
}

function VaultCreate({ onDone }: { onDone: () => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/vault/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, url: url || null, username: username || null, password: password || null, notes: notes || null })
      });
      onDone();
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col">
      <div className="row">
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label" />
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="url (optional)" />
      </div>
      <div className="row">
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="notes"
        style={{
          width: "100%",
          minHeight: 140,
          padding: 12,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--text)"
        }}
      />
      {error ? <div style={{ color: "var(--danger)" }}>{error}</div> : null}
      <div className="row">
        <button className="btn primary" onClick={create} disabled={busy || !label.trim()}>
          {busy ? "…" : "Create"}
        </button>
      </div>
    </div>
  );
}

function VaultEdit({ itemId, onDone }: { itemId: string; onDone: () => void }) {
  const [data, setData] = useState<VaultPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/vault/items/${itemId}`)
      .then((res: any) => setData(res.data))
      .catch((e: any) => setError(`${e.status || ""} ${e.message || "Failed"}`.trim()));
  }, [itemId]);

  async function save() {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/vault/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      onDone();
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this vault entry?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/vault/items/${itemId}`, { method: "DELETE" });
      onDone();
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div style={{ color: "var(--danger)" }}>{error}</div>;
  if (!data) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div className="col">
      <div className="row">
        <input className="input" value={data.label} onChange={(e) => setData({ ...data, label: e.target.value })} />
        <input className="input" value={data.url || ""} onChange={(e) => setData({ ...data, url: e.target.value })} placeholder="url" />
      </div>
      <div className="row">
        <input className="input" value={data.username || ""} onChange={(e) => setData({ ...data, username: e.target.value })} placeholder="username" />
        <input className="input" value={data.password || ""} onChange={(e) => setData({ ...data, password: e.target.value })} placeholder="password" />
      </div>
      <textarea
        value={data.notes || ""}
        onChange={(e) => setData({ ...data, notes: e.target.value })}
        placeholder="notes"
        style={{
          width: "100%",
          minHeight: 140,
          padding: 12,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--text)"
        }}
      />
      <div className="row">
        <button className="btn primary" onClick={save} disabled={busy || !data.label.trim()}>
          {busy ? "…" : "Save"}
        </button>
        <button className="btn danger" onClick={del} disabled={busy}>
          Delete
        </button>
      </div>
      {error ? <div style={{ color: "var(--danger)" }}>{error}</div> : null}
    </div>
  );
}

function VaultImport({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function runImport() {
    if (!file) return setError("Pick a Bitwarden JSON export file");
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = (await apiFetch("/vault/import/bitwarden", { method: "POST", body: fd })) as any;
      setResult(`Imported ${res.imported}, skipped ${res.skipped}`);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col">
      <div className="muted2">
        Export from Bitwarden as JSON (explicit user action), then import here. This is the safe “autosave” path.
      </div>
      <input type="file" accept=".json,application/json" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <div className="row">
        <button className="btn primary" onClick={runImport} disabled={busy || !file}>
          {busy ? "…" : "Import"}
        </button>
        <button className="btn" onClick={onDone}>
          Done
        </button>
      </div>
      {result ? <div style={{ color: "var(--accent2)" }}>{result}</div> : null}
      {error ? <div style={{ color: "var(--danger)" }}>{error}</div> : null}
    </div>
  );
}
