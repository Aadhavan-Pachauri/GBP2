"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type User = { id: string; username: string; created_at: number; is_admin: boolean };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = (await apiFetch("/users")) as User[];
      setUsers(res);
    } catch (e: any) {
      setError(`${e.status || ""} ${e.message || "Failed"}`.trim());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = (await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, is_admin: isAdmin })
      })) as any;
      setOk(`Created ${res.username}`);
      setUsername("");
      setPassword("");
      setIsAdmin(false);
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
        <div className="h1">Users</div>
        <div className="muted">Profiles: separate data (files, vault, devices) per person.</div>
      </div>

      <div className="card padded">
        <div className="h2">Create user</div>
        <div className="muted2">Only admins can create users. Password policy is enforced by the backend.</div>
        <div style={{ height: 12 }} />
        <div className="row">
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
          <label className="pill" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} /> admin
          </label>
          <button className="btn primary" onClick={create} disabled={busy || !username.trim() || password.length < 4}>
            {busy ? "…" : "Create"}
          </button>
        </div>
        {ok ? <div style={{ marginTop: 10, color: "var(--accent2)" }}>{ok}</div> : null}
        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}
      </div>

      <div className="card padded">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="h2">Existing users</div>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        <div style={{ height: 12 }} />
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th>User ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.username}</td>
                  <td className="muted2">{u.is_admin ? "admin" : "user"}</td>
                  <td className="muted2">{new Date(u.created_at * 1000).toLocaleString()}</td>
                  <td className="mono muted2">{u.id}</td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td colSpan={4} className="muted2">
                    No users.
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
