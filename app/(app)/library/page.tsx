import { Suspense } from "react";
import LibraryClient from "./LibraryClient";

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="card padded">
          <div className="h1">Library</div>
          <div className="muted2">Loading…</div>
        </div>
      }
    >
      <LibraryClient />
    </Suspense>
  );
}

