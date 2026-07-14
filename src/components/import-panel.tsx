"use client";
import { useState } from "react";
import { CheckCircle2, FileJson, Upload } from "lucide-react";
import { Panel } from "./ui";
type Preview = {
  valid: boolean;
  errors?: string[];
  characters?: {
    name: string;
    slug: string;
    action: string;
    reason?: string;
  }[];
  records?: {
    category: string;
    name: string;
    action: string;
    reason?: string;
  }[];
  data?: unknown;
};
export function ImportPanel() {
  const [raw, setRaw] = useState<unknown>();
  const [preview, setPreview] = useState<Preview>();
  const [status, setStatus] = useState("");
  async function choose(file?: File) {
    if (!file) return;
    setStatus("");
    try {
      const data = JSON.parse(await file.text());
      setRaw(data);
      const response = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setPreview(await response.json());
    } catch {
      setPreview({
        valid: false,
        errors: ["The selected file is not valid JSON."],
      });
    }
  }
  async function apply() {
    if (
      !raw ||
      !window.confirm(
        "Apply this import? A database backup will be created first.",
      )
    )
      return;
    setStatus("Applying import…");
    const response = await fetch("/api/import/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
    const result = await response.json();
    setStatus(
      result.ok
        ? "Import complete. Backup created successfully."
        : result.error || "Import failed.",
    );
    if (result.ok) window.location.reload();
  }
  return (
    <Panel>
      <div className="mb-4 flex items-center gap-3">
        <Upload className="text-amber-300" />
        <div>
          <h2 className="font-semibold">Import roster</h2>
          <p className="text-xs text-zinc-500">JSON format, schema version 1</p>
        </div>
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 p-7 text-sm text-zinc-400 hover:border-amber-300/50">
        <FileJson size={18} />
        Choose JSON file
        <input
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </label>
      {preview && (
        <div className="mt-5">
          {!preview.valid ? (
            <div className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
              {preview.errors?.join(" · ")}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 size={16} />
                Validation passed
              </div>
              <div className="max-h-60 overflow-y-auto border border-white/10">
                {preview.records?.map((c, index) => (
                  <div
                    className="flex justify-between border-b border-white/5 p-2 text-xs"
                    key={`${c.category}-${c.name}-${index}`}
                  >
                    <span>
                      <span className="text-zinc-600">{c.category}</span> ·{" "}
                      {c.name}
                    </span>
                    <span
                      className={
                        c.action === "reject"
                          ? "text-red-300"
                          : c.action === "update"
                            ? "text-amber-300"
                            : "text-emerald-300"
                      }
                    >
                      {c.action.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={apply}
                disabled={preview.records?.some(
                  (record) => record.action === "reject",
                )}
                className="mt-4 w-full border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm and apply import
              </button>
            </>
          )}
        </div>
      )}
      {status && <p className="mt-3 text-sm text-zinc-400">{status}</p>}
    </Panel>
  );
}
