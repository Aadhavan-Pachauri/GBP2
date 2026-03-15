"use client";

import { useState } from "react";
import { getApiBase, getToken } from "@/lib/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [logicalPath, setLogicalPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  async function doUpload() {
    setError(null);
    setOk(null);
    setProgress(0);
    if (!file) return setError("Pick a file");
    if (!logicalPath.trim()) return setError("Set logical_path (example: Laptop/Documents/report.pdf)");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("logical_path", logicalPath.trim());

    setBusy(true);
    try {
      const base = getApiBase();
      const tok = getToken();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${base}/items/upload`);
        if (tok) xhr.setRequestHeader("Authorization", `Bearer ${tok}`);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });
      setOk("Uploaded. It will appear in Files.");
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col">
      <div>
        <div className="h1">Upload</div>
        <div className="muted">Manual uploader (agents handle autosync).</div>
      </div>

      <div
        className="card padded"
        style={{ boxShadow: "none", borderStyle: "dashed" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) {
            setFile(f);
            if (!logicalPath?.trim()) setLogicalPath(`WebUploads/${f.name}`);
          }
        }}
      >
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h2">Drop a file</div>
            <div className="muted2">Drag & drop here, or pick a file.</div>
          </div>
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !logicalPath?.trim()) setLogicalPath(`WebUploads/${f.name}`);
            }}
          />
        </div>
        <div style={{ height: 12 }} />
        <div className="row">
          <input className="input" value={logicalPath} onChange={(e) => setLogicalPath(e.target.value)} placeholder="logical_path" />
          <button className="btn primary" onClick={doUpload} disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </button>
          {progress ? <span className="pill">{progress}%</span> : null}
        </div>
        <div style={{ height: 10 }} />
        <div className="muted2 mono">{file ? `${file.name} (${file.size} bytes)` : "No file selected"}</div>
        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}
        {ok ? <div style={{ marginTop: 10, color: "var(--accent2)" }}>{ok}</div> : null}
      </div>
    </div>
  );
}
