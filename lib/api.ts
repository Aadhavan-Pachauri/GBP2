"use client";

export type ApiError = { status: number; message: string };

export type Theme = "dark" | "light";

export function normalizeApiBase(input: string): { ok: boolean; base: string; error?: string } {
  const raw = (input || "").trim();
  if (!raw) return { ok: false, base: "", error: "API base is empty" };

  // Common typo: "127.0.0.1.5050" -> "127.0.0.1:5050"
  const fixed = raw.replace(/^(\d+\.\d+\.\d+\.\d+)\.(\d{2,5})$/, "$1:$2");

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(fixed) ? fixed : `http://${fixed}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, base: "", error: "Invalid URL. Use http://127.0.0.1:5050 or https://xxxx.ngrok.app" };
  }
  if (!u.hostname) return { ok: false, base: "", error: "Invalid URL (missing hostname)" };
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, base: "", error: "Invalid URL scheme (use http or https)" };
  }
  const base = `${u.protocol}//${u.host}`.replace(/\/+$/, "");
  return { ok: true, base };
}

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem("gbp_theme");
    if (t === "light" || t === "dark") return t;
  } catch (_e) {}
  return "dark";
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem("gbp_theme", t);
  } catch (_e) {}
}

export function getApiBase(): string {
  try {
    const o = localStorage.getItem("gbp_api_base");
    if (o && o.trim()) return o.trim().replace(/\/+$/, "");
  } catch (_e) {}
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (base && base.trim()) return base.replace(/\/+$/, "");
  return "";
}

export function setApiBaseOverride(base: string) {
  const norm = normalizeApiBase(base);
  if (!norm.ok) return;
  const v = norm.base.replace(/\/+$/, "");
  if (!v) return;
  try {
    localStorage.setItem("gbp_api_base", v);
  } catch (_e) {}
}

export function clearApiBaseOverride() {
  try {
    localStorage.removeItem("gbp_api_base");
  } catch (_e) {}
}

export function getToken(): string | null {
  try {
    return localStorage.getItem("gbp_token");
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem("gbp_token");
  else localStorage.setItem("gbp_token", token);
}

export async function apiFetchResponse(path: string, init: RequestInit = {}) {
  const base = getApiBase();
  if (!base) {
    const err: ApiError = { status: 0, message: "Missing API base. Set it on the Login page (Server box) or in Settings." };
    throw err;
  }
  const headers = new Headers(init.headers || {});
  const tok = getToken();
  if (tok) headers.set("Authorization", `Bearer ${tok}`);
  headers.set("Accept", "application/json");
  try {
    const host = new URL(base).hostname || "";
    if (host.includes("ngrok")) headers.set("ngrok-skip-browser-warning", "true");
  } catch (_e) {}
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    let msg = "";
    if (ct.includes("application/json")) {
      msg = await res.text().catch(() => "");
    } else {
      const t = await res.text().catch(() => "");
      if (t.trim().startsWith("<!DOCTYPE") || t.trim().startsWith("<html")) msg = "Server returned HTML (wrong API base or proxy).";
      else msg = t;
    }
    msg = (msg || res.statusText || "").toString();
    if (msg.length > 280) msg = msg.slice(0, 280) + "…";
    const err: ApiError = { status: res.status, message: msg || res.statusText };
    throw err;
  }
  return res;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await apiFetchResponse(path, init);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}
