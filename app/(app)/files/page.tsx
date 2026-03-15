import { Suspense } from "react";
import FilesClient from "./FilesClient";

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <div className="card padded">
          <div className="h1">Files</div>
          <div className="muted2">Loading…</div>
        </div>
      }
    >
      <FilesClient />
    </Suspense>
  );
}

