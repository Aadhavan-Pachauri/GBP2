import { Suspense } from "react";
import VaultClient from "./VaultClient";

export default function VaultPage() {
  return (
    <Suspense
      fallback={
        <div className="card padded">
          <div className="h1">Passwords</div>
          <div className="muted2">Loading…</div>
        </div>
      }
    >
      <VaultClient />
    </Suspense>
  );
}

