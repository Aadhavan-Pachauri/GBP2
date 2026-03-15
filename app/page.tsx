"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    const tok = getToken();
    router.replace(tok ? "/dashboard" : "/login");
  }, [router]);
  return (
    <div style={{ padding: 24 }}>
      <div className="card padded" style={{ maxWidth: 520, margin: "80px auto" }}>
        <div className="h1">GBP</div>
        <p className="muted">Loading…</p>
      </div>
    </div>
  );
}

