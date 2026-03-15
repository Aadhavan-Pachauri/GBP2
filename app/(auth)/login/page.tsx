"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearApiBaseOverride, normalizeApiBase, setApiBaseOverride, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [apiBase, setApiBase] = useState(() => {
    try {
      return (localStorage.getItem("gbp_api_base") || "").trim();
    } catch {
      return "";
    }
  });
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const [status, setStatus] = useState<{ initialized: boolean; allow_public_signup: boolean; min_password_len: number } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const effectiveBase = useMemo(() => apiBase.trim().replace(/\/+$/, ""), [apiBase]);

  useEffect(() => {
    // Try to detect if registration is available (no auth required).
    const raw =
      effectiveBase ||
      (() => {
        try {
          return (localStorage.getItem("gbp_api_base") || "").trim();
        } catch {
          return "";
        }
      })();
    if (!raw) return;
    const norm = normalizeApiBase(raw);
    if (!norm.ok) {
      setStatus(null);
      setStatusError(norm.error || "Invalid API base");
      return;
    }
    const base = norm.base;

    let cancelled = false;
    setStatusError(null);
    const headers = new Headers({ Accept: "application/json" });
    try {
      const host = new URL(base).hostname || "";
      if (host.includes("ngrok")) headers.set("ngrok-skip-browser-warning", "true");
    } catch (_e) {}

    fetch(`${base}/auth/status`, { headers }).then(async (r) => {
      if (!r.ok) {
        const ct = r.headers.get("content-type") || "";
        const t = await r.text().catch(() => "");
        if (ct.includes("text/html") || t.trim().startsWith("<!DOCTYPE") || t.trim().startsWith("<html")) {
          throw new Error("Got HTML/404 (your API base is wrong). Use http://127.0.0.1:5050 or https://xxxx.ngrok.app");
        }
        throw new Error(t || r.statusText);
      }
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await r.text().catch(() => "");
        throw new Error(t.trim().startsWith("<!DOCTYPE") || t.trim().startsWith("<html") ? "Got HTML from server (ngrok warning or wrong URL)" : "Non-JSON response from server");
      }
      return r.json();
    })
      .then((j) => {
        if (cancelled) return;
        setStatus(j);
        if (!j.initialized) setRegisterOpen(true);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setStatus(null);
        setStatusError(String(e?.message || "Failed to reach server"));
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveBase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      setToken((res as any).token);
      router.push("/dashboard");
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Login failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegBusy(true);
    setRegError(null);
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regUsername, password: regPassword })
      });
      setToken((res as any).token);
      router.push("/dashboard");
    } catch (e: any) {
      setRegError(`${e.status || ""} ${e.message || "Register failed"}`.trim());
    } finally {
      setRegBusy(false);
    }
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="h1">Login</div>
          <div className="muted">Admin login for your server.</div>
        </div>
        <span className="pill mono" style={{ fontSize: 12 }}>
          /auth/login
        </span>
      </div>
      <div style={{ height: 12 }} />
      <form onSubmit={onSubmit} className="col">
        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="h2">Server</div>
              <div className="muted2">Set this to your old-PC backend URL (ngrok URL when remote).</div>
            </div>
            <span className="pill mono" style={{ fontSize: 12 }}>
              gbp_api_base
            </span>
          </div>
          <div style={{ height: 10 }} />
          <div className="row">
            <input
              className="input"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://xxxx.ngrok.app  (or http://127.0.0.1:5050)"
              style={{ flex: 1, minWidth: 320 }}
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                setServerError(null);
                const v = apiBase.trim();
                if (!v) {
                  clearApiBaseOverride();
                  location.reload();
                  return;
                }
                const norm = normalizeApiBase(v);
                if (!norm.ok) {
                  setServerError(norm.error || "Invalid API base");
                  return;
                }
                setApiBase(norm.base);
                setApiBaseOverride(norm.base);
                location.reload();
              }}
            >
              Save
            </button>
          </div>
          <div style={{ height: 8 }} />
          <div className="muted2">
            If you host this UI on HTTPS (Vercel), your API base must be HTTPS too (use ngrok HTTPS).
          </div>
          {serverError ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{serverError}</div> : null}
          {status ? (
            <>
              <div style={{ height: 10 }} />
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted2">Status</span>
                <span className="pill">
                  {status.initialized ? "initialized" : "new server"}
                </span>
                <span className="pill">min password: {status.min_password_len}</span>
                <span className="pill">{status.allow_public_signup ? "signup on" : "signup off"}</span>
              </div>
            </>
          ) : statusError ? (
            <>
              <div style={{ height: 10 }} />
              <div style={{ color: "var(--danger)" }}>{statusError}</div>
            </>
          ) : null}
        </div>

        <div className="row">
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="password"
          />
        </div>
        <div className="row">
          <button className="btn primary" disabled={busy}>
            {busy ? "Signing in…" : "Login"}
          </button>
          <span className="muted2">
            Uses the admin from <span className="mono">backend/.env</span>
          </span>
        </div>
        {error ? <div style={{ color: "var(--danger)" }}>{error}</div> : null}
      </form>

      <div style={{ height: 14 }} />
      <div className="card padded" style={{ boxShadow: "none" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h2">Create account</div>
            <div className="muted2">
              Use this if you don’t want to log in as <span className="mono">admin</span>.
            </div>
          </div>
          <button className="btn" onClick={() => setRegisterOpen((v) => !v)}>
            {registerOpen ? "Hide" : "Show"}
          </button>
        </div>
        {registerOpen ? (
          <>
            <div style={{ height: 12 }} />
            <form onSubmit={onRegister} className="col">
              <div className="row">
                <input className="input" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="new username" />
                <input
                  className="input"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder={`password (min ${status?.min_password_len ?? 8})`}
                  type="password"
                />
                <button className="btn primary" disabled={regBusy}>
                  {regBusy ? "Creating…" : "Create"}
                </button>
              </div>
              {regError ? <div style={{ color: "var(--danger)" }}>{regError}</div> : null}
              <div className="muted2" style={{ marginTop: 10 }}>
                Registration is allowed when <span className="mono">ALLOW_PUBLIC_SIGNUP=1</span> on the backend, or on a brand new empty server.
              </div>
            </form>
          </>
        ) : null}
      </div>
    </>
  );
}
