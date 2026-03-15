"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearApiBaseOverride, getApiBase, getToken, setToken, setTheme, getTheme } from "@/lib/api";
import { CommandPalette } from "@/lib/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [meOk, setMeOk] = useState<boolean | null>(null);
  const [me, setMe] = useState<{ user_id: string; username?: string | null; is_admin: boolean } | null>(null);
  const [apiBase, setApiBase] = useState<string>("");
  const [theme, setThemeState] = useState(getTheme());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = useMemo(
    () => {
      const base = [
        { href: "/dashboard", label: "Home", icon: "⌂" },
        { href: "/library", label: "Library", icon: "▦" },
        { href: "/vault", label: "Passwords", icon: "🔐" },
        { href: "/upload", label: "Upload" },
        { href: "/shares", label: "Shares" },
        { href: "/devices", label: "Devices" },
        { href: "/activity", label: "Activity" },
        { href: "/settings", label: "Settings", icon: "⚙" }
      ];
      if (me?.is_admin) base.splice(base.length - 1, 0, { href: "/setup", label: "Setup", icon: "★" }, { href: "/users", label: "Users", icon: "👥" });
      return base;
    },
    [me?.is_admin]
  );

  useEffect(() => {
    setApiBase(getApiBase());
    const tok = getToken();
    if (!tok) {
      router.replace("/login");
      return;
    }
    apiFetch("/me")
      .then((m: any) => {
        setMe(m);
        setMeOk(true);
      })
      .catch(() => {
        setMeOk(false);
        setMe(null);
        setToken(null);
        router.replace("/login");
      });
  }, [router]);

  function logout() {
    setToken(null);
    router.replace("/login");
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setThemeState(next);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="shell">
      {sidebarOpen ? <div className="backdrop" onClick={() => setSidebarOpen(false)} /> : null}
      <div className="card padded sidebar" data-open={sidebarOpen ? "1" : "0"} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div className="h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="navIcon" style={{ width: 40, height: 40, borderRadius: 14 }}>
                G
              </span>
              <span>GBP</span>
            </div>
            <div className="muted2" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {apiBase}
            </div>
          </div>
          <button className="btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>

        <div className="sideTitle">Navigate</div>
        <div className="col" style={{ gap: 8 }}>
          {nav.map((n: any) => {
            const active = pathname?.startsWith(n.href);
            return (
              <button
                key={n.href}
                className="navLink"
                data-active={active ? "1" : "0"}
                onClick={() => {
                  router.push(n.href);
                  setSidebarOpen(false);
                }}
              >
                <span className="navLeft">
                  <span className="navIcon">{n.icon || "•"}</span>
                  <span className="navLabel" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.label}
                  </span>
                </span>
                <span className="muted2">›</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div className="card padded" style={{ background: "rgba(0,0,0,0.18)", boxShadow: "none" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted">Profile</div>
            <span className="pill" style={{ fontSize: 12 }}>
              {meOk === null ? "checking…" : meOk ? "online" : "expired"}
            </span>
          </div>
          <div style={{ height: 10 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted2">User</div>
            <span className="pill mono" style={{ fontSize: 12 }}>
              {me?.username || "—"}
            </span>
          </div>
          <div style={{ height: 10 }} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted2">Role</div>
            <span className="pill" style={{ fontSize: 12 }}>
              {me?.is_admin ? "admin" : "user"}
            </span>
          </div>
          <div style={{ height: 12 }} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={logout}>
              Logout
            </button>
            <button
              className="btn"
              onClick={() => {
                clearApiBaseOverride();
                location.reload();
              }}
              title="Reset API base override"
            >
              Reset API
            </button>
          </div>
        </div>
      </div>

      <div className="main">
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="topbar">
            <button className="btn mobileOnly" onClick={() => setSidebarOpen(true)} title="Menu">
              ☰
            </button>
            <div
              className="searchBox"
              onClick={() => {
                const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
                const ev = new KeyboardEvent("keydown", { key: "k", ctrlKey: !isMac, metaKey: isMac });
                window.dispatchEvent(ev);
              }}
              title="Search (Ctrl/⌘ + K)"
            >
              <span className="muted2">🔎</span>
              <span className="searchText">Search everything (Ctrl/⌘ K)…</span>
              <span className="searchKbd">
                <span className="kbd">{navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}</span>
                <span className="kbd">K</span>
              </span>
            </div>
            <button className="btn primary desktopOnly" onClick={() => router.push("/upload")}>
              Upload
            </button>
          </div>
          <div style={{ height: 14 }} />
          {children}
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
