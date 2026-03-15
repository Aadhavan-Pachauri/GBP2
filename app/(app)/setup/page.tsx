"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getApiBase } from "@/lib/api";
import { dt } from "@/lib/format";

type Me = { user_id: string; username?: string | null; is_admin: boolean };
type Stats = { items: number; versions: number; blobs: number; bytes: number; devices_active: number };

export default function SetupPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const apiBase = useMemo(() => {
    try {
      return getApiBase();
    } catch {
      return "";
    }
  }, []);

  async function refresh() {
    setBusy(true);
    setErr(null);
    try {
      const m = (await apiFetch("/me")) as any;
      setMe(m as Me);
      const h = (await apiFetch("/health")) as any;
      setHealthOk(Boolean(h?.ok));
      const s = (await apiFetch("/stats")) as any;
      setStats(s as Stats);
    } catch (e: any) {
      setErr(`${e.status || ""} ${e.message || "Failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (me && !me.is_admin) {
    return (
      <div className="card padded">
        <div className="h1">Setup</div>
        <div className="muted2">Admin-only page.</div>
        <div style={{ height: 12 }} />
        <button className="btn" onClick={() => router.push("/dashboard")}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="h1">Setup</div>
          <div className="muted">Get a new server usable in minutes: users, devices, passwords, sharing.</div>
        </div>
        <button className="btn primary" onClick={refresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err ? (
        <div className="card padded" style={{ borderColor: "rgba(239,68,68,0.5)", boxShadow: "none" }}>
          <div className="h2">Error</div>
          <div className="muted2">{err}</div>
        </div>
      ) : null}

      <div className="grid setupGrid">
        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="h2">1) Verify the server</div>
          <div className="muted2">Make sure the old PC backend is reachable and healthy.</div>
          <div style={{ height: 12 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted2">API base</div>
            <span className="pill mono">{apiBase || "—"}</span>
          </div>
          <div style={{ height: 10 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted2">Health</div>
            <span className="pill">{healthOk === null ? "…" : healthOk ? "ok" : "bad"}</span>
          </div>
          <div style={{ height: 10 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted2">Signed in as</div>
            <span className="pill mono">{me?.username || "—"}</span>
          </div>
          <div style={{ height: 10 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted2">Stored items</div>
            <span className="pill">{stats ? `${stats.items}` : "—"}</span>
          </div>
          <div style={{ height: 12 }} />
          <div className="muted2">
            If this isn’t reachable, go to <span className="mono">Settings</span> and set the API base (for example your ngrok URL).
          </div>
        </div>

        <CreateUserCard />
        <CreateDeviceCard />
        <PasswordsCard />
        <RemoteAccessCard />
      </div>
    </div>
  );
}

function CreateUserCard() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const minLen = 4;

  async function create() {
    setBusy(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ username, password, is_admin: isAdmin })
      });
      setUsername("");
      setPassword("");
      alert("User created.");
    } catch (e: any) {
      alert(`${e.status || ""} ${e.message || "Create failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card padded" style={{ boxShadow: "none" }}>
      <div className="h2">2) Create profiles</div>
      <div className="muted2">Profiles are isolated: passwords/files never mix across users.</div>
      <div style={{ height: 12 }} />
      <div className="row">
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`password (min ${minLen})`} type="password" />
      </div>
      <div style={{ height: 10 }} />
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
        <span className="muted2">Admin</span>
      </label>
      <div style={{ height: 12 }} />
      <button className="btn primary" onClick={create} disabled={busy || username.trim().length < 1 || password.length < minLen}>
        {busy ? "Creating…" : "Create user"}
      </button>
      <div style={{ height: 10 }} />
      <div className="muted2">
        If you want weak passwords, set <span className="mono">ALLOW_WEAK_PASSWORDS=1</span> in <span className="mono">backend/.env</span> (not recommended when exposed).
      </div>
    </div>
  );
}

function CreateDeviceCard() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceKey, setDeviceKey] = useState("");

  async function create() {
    setBusy(true);
    try {
      const r = (await apiFetch("/devices", { method: "POST", body: JSON.stringify({ name }) })) as any;
      setDeviceId(r.device_id || "");
      setDeviceKey(r.device_key || "");
    } catch (e: any) {
      alert(`${e.status || ""} ${e.message || "Create failed"}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card padded" style={{ boxShadow: "none" }}>
      <div className="h2">3) Register a device</div>
      <div className="muted2">A device key lets an agent upload files without storing your login password.</div>
      <div style={{ height: 12 }} />
      <div className="row">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="device name (e.g. laptop)" />
        <button className="btn primary" onClick={create} disabled={busy || !name.trim()}>
          {busy ? "…" : "Create device"}
        </button>
      </div>
      {deviceId ? (
        <div style={{ marginTop: 12 }} className="card padded">
          <div className="muted2" style={{ fontSize: 12 }}>
            Use these on the device:
          </div>
          <div style={{ height: 8 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted2">Device ID</span>
            <span className="pill mono">{deviceId}</span>
          </div>
          <div style={{ height: 8 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted2">Device Key</span>
            <span className="pill mono">{deviceKey}</span>
          </div>
          <div style={{ height: 10 }} />
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard.writeText(`GBP_DEVICE_ID=${deviceId}\nGBP_DEVICE_KEY=${deviceKey}`).catch(() => {});
            }}
          >
            Copy env
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PasswordsCard() {
  return (
    <div className="card padded" style={{ boxShadow: "none" }}>
      <div className="h2">4) Password autosave + autosort</div>
      <div className="muted2">Best-in-class flow: capture on login, approve once, then autofill on demand.</div>
      <div style={{ height: 12 }} />
      <div className="col" style={{ gap: 10 }}>
        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="h2" style={{ fontSize: 14 }}>
            Browser extension
          </div>
          <div className="muted2">
            Install from <span className="mono">app/extension</span> (Chrome/Edge “Load unpacked”), then sign in from the extension options.
          </div>
        </div>
        <div className="card padded" style={{ boxShadow: "none" }}>
          <div className="h2" style={{ fontSize: 14 }}>
            Domain autosort
          </div>
          <div className="muted2">
            Saved entries automatically group by domain, so passwords never get messy even at scale.
          </div>
        </div>
        <div className="muted2">
          Note: This system intentionally does not “steal” existing browser-saved passwords. It captures safely at the moment you log in.
        </div>
      </div>
    </div>
  );
}

function RemoteAccessCard() {
  const now = Math.floor(Date.now() / 1000);
  return (
    <div className="card padded" style={{ boxShadow: "none" }}>
      <div className="h2">5) Remote access</div>
      <div className="muted2">Expose the old PC backend to your devices when you’re not on the same Wi‑Fi.</div>
      <div style={{ height: 12 }} />
      <div className="card padded" style={{ boxShadow: "none" }}>
        <div className="muted2" style={{ fontSize: 12 }}>
          Example with ngrok
        </div>
        <div style={{ height: 8 }} />
        <div className="mono">ngrok http 5000</div>
        <div style={{ height: 10 }} />
        <div className="muted2">
          Then copy the https URL into <span className="mono">Settings → API base</span> on every client (web, desktop, mobile, extension).
        </div>
      </div>
      <div style={{ height: 10 }} />
      <div className="muted2">Security reminder ({dt(now)}): if you expose the API to the internet, use strong passwords and revoke lost devices immediately.</div>
    </div>
  );
}
