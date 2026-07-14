"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { Badge, Panel, fieldClass } from "./ui";

type DisconnectedStatus = { connected: false };
type ConnectedStatus = {
  connected: true;
  playerName: string | null;
  maskedPlayerId: string;
  status: string;
  lastAttemptedSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  upstreamLastUpdatedAt: string | null;
  keyFingerprint: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  syncRuns: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    recordsReceived: number;
    errorMessage: string | null;
  }[];
};
type ConnectionStatus = DisconnectedStatus | ConnectedStatus;
type Preview = {
  confirmationToken: string;
  playerName: string;
  maskedPlayerId: string;
  powerLevel: number;
  unitCount: number;
  inventoryRecordCount: number;
  upstreamLastUpdatedAt: string;
  stale: boolean;
};
type SyncResult = {
  playerName?: string;
  unitCount?: number;
  inventoryRecordCount?: number;
  upstreamLastUpdatedAt?: string;
  fixtureGenerated?: boolean;
  rosterCount?: number;
  inventoryCount?: number;
  synchronizedCharacterCount?: number;
  campaignCount?: number;
  eventCount?: number;
};
type RosterPreview = {
  previewToken: string;
  expiresAt: string;
  summary: Record<string, number>;
  characterChanges: Array<{
    externalId: string;
    name: string;
    status: string;
    changes: Array<{
      field: string;
      previousValue: string | null;
      newValue: string | null;
    }>;
  }>;
  inventoryChanges: Array<{
    externalId: string;
    name: string | null;
    category: string;
    status: string;
    previousQuantity: number | null;
    newQuantity: number;
  }>;
  campaignChanges: Array<{ externalKey: string; name: string; status: string }>;
  eventChanges: Array<{ externalKey: string; name: string; status: string }>;
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Never";
}

export function TacticusIntegrationPanel() {
  const keyInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [rosterPreview, setRosterPreview] = useState<RosterPreview | null>(
    null,
  );
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshStatus() {
    const response = await fetch("/api/integrations/tacticus/status", {
      cache: "no-store",
    });
    setStatus(await response.json());
  }
  useEffect(() => {
    let active = true;
    fetch("/api/integrations/tacticus/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active) setStatus(result);
      });
    return () => {
      active = false;
    };
  }, []);

  async function request(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.message || "The request could not be completed safely.",
      );
    return result;
  }

  async function testConnection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSyncResult(null);
    const apiKey = keyInput.current?.value ?? "";
    try {
      const result = await request("/api/integrations/tacticus/test", {
        apiKey,
      });
      setPreview(result);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The API key was not accepted.",
      );
    } finally {
      if (keyInput.current) keyInput.current.value = "";
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      await request("/api/integrations/tacticus/confirm", {
        confirmationToken: preview.confirmationToken,
      });
      setPreview(null);
      await refreshStatus();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Connection confirmation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await request("/api/integrations/tacticus/cancel");
      setPreview(null);
      setMessage("");
    } finally {
      setBusy(false);
    }
  }
  async function sync() {
    setBusy(true);
    setMessage("");
    setSyncResult(null);
    try {
      setRosterPreview(await request("/api/integrations/tacticus/preview"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Synchronization failed safely.",
      );
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }
  async function applySync() {
    if (
      !rosterPreview ||
      !window.confirm(
        "Apply these roster and inventory changes? Local notes, priorities, teams, and goals will be preserved.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const result = await request("/api/integrations/tacticus/apply", {
        previewToken: rosterPreview.previewToken,
        confirmed: true,
      });
      setSyncResult(result);
      setRosterPreview(null);
      await refreshStatus();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Synchronization failed safely.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    if (
      !window.confirm(
        "Disconnect the Tacticus account? Existing roster and strategy data will be preserved.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      await request("/api/integrations/tacticus/disconnect");
      setSyncResult(null);
      await refreshStatus();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Disconnect failed safely.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!status)
    return (
      <Panel>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={18} />
          Loading integration status…
        </div>
      </Panel>
    );

  if (!status.connected && preview)
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-300" />
            <div>
              <h2 className="text-lg font-semibold">Confirm this account</h2>
              <p className="text-xs text-zinc-500">
                Player state validated by the official API
              </p>
            </div>
          </div>
          <dl className="grid gap-px bg-white/10 sm:grid-cols-2">
            {[
              ["Player", preview.playerName],
              ["Player ID", preview.maskedPlayerId],
              ["Power level", preview.powerLevel],
              ["Character records", preview.unitCount],
              ["Inventory records", preview.inventoryRecordCount],
              ["Upstream updated", formatDate(preview.upstreamLastUpdatedAt)],
            ].map(([name, value]) => (
              <div className="bg-[#101618] p-4" key={String(name)}>
                <dt className="font-mono text-[10px] tracking-widest text-zinc-600">
                  {name}
                </dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {preview.stale && (
            <p className="mt-4 border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              The official player state is more than 24 hours old.
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              disabled={busy}
              onClick={confirm}
              className="border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              Connect This Account
            </button>
            <button
              disabled={busy}
              onClick={cancel}
              className="border border-white/15 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </Panel>
        <SecurityPanel />
      </div>
    );

  if (!status.connected)
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            <KeyRound className="text-amber-300" />
            <div>
              <h2 className="text-lg font-semibold">
                Connect official Player API
              </h2>
              <p className="text-xs text-zinc-500">
                Read-only proof of concept
              </p>
            </div>
          </div>
          <p className="mb-5 text-sm leading-6 text-zinc-400">
            Generate a key with the <b className="text-zinc-200">Player</b>{" "}
            scope in the official Tacticus API portal. This phase validates
            identity and the upstream contract without changing your roster.
          </p>
          <a
            className="mb-6 inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200"
            href="https://api.tacticusgame.com/settings"
            target="_blank"
            rel="noreferrer"
          >
            Open the official API portal <ExternalLink size={14} />
          </a>
          <form onSubmit={testConnection}>
            <label className="text-sm text-zinc-400">
              Player read API key
              <input
                ref={keyInput}
                data-testid="tacticus-api-key"
                className={fieldClass}
                name="apiKey"
                type="password"
                required
                minLength={12}
                maxLength={512}
                autoComplete="new-password"
                spellCheck={false}
              />
            </label>
            <button
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              Test Connection
            </button>
          </form>
          {message && (
            <p
              role="alert"
              className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
            >
              {message}
            </p>
          )}
        </Panel>
        <SecurityPanel />
      </div>
    );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
      <div className="space-y-6">
        <Panel>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-zinc-500">
                CONNECTED PLAYER
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {status.playerName || "Tacticus account"}
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                Player ID: {status.maskedPlayerId}
              </p>
            </div>
            <Badge value={status.status} />
          </div>
          <dl className="grid gap-4 border-y border-white/10 py-5 sm:grid-cols-2">
            {[
              ["Last attempted", formatDate(status.lastAttemptedSyncAt)],
              ["Last successful", formatDate(status.lastSuccessfulSyncAt)],
              ["Upstream updated", formatDate(status.upstreamLastUpdatedAt)],
              ["Key fingerprint", status.keyFingerprint],
            ].map(([name, value]) => (
              <div key={String(name)}>
                <dt className="text-xs text-zinc-600">{name}</dt>
                <dd className="mt-1 font-mono text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          {status.lastErrorMessage && (
            <p
              role="alert"
              className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
            >
              {status.lastErrorMessage}
            </p>
          )}
          {message && (
            <p
              role="alert"
              className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
            >
              {message}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              disabled={busy || status.status === "SYNCING"}
              onClick={sync}
              className="inline-flex items-center justify-center gap-2 border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              <RefreshCw className={busy ? "animate-spin" : ""} size={16} />
              Preview Sync
            </button>
            <button
              disabled={busy}
              onClick={disconnect}
              className="inline-flex items-center justify-center gap-2 border border-red-400/30 px-4 py-2 text-sm text-red-300"
            >
              <Unplug size={16} />
              Disconnect
            </button>
          </div>
        </Panel>
        {rosterPreview && (
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-amber-300">
                  REVIEW REQUIRED
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  Synchronization preview
                </h3>
              </div>
              <button
                disabled={busy}
                onClick={applySync}
                className="border border-emerald-300 bg-emerald-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                Confirm and apply
              </button>
            </div>
            <div className="mt-5 grid gap-px bg-white/10 sm:grid-cols-3">
              {Object.entries(rosterPreview.summary).map(([key, value]) => (
                <div className="bg-[#101618] p-3" key={key}>
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {key.replace(/([A-Z])/g, " $1")}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "ALL",
                "CREATE",
                "UPDATE",
                "UNCHANGED",
                "UNMATCHED",
                "REJECTED",
              ].map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`border px-2 py-1 text-xs ${filter === value ? "border-amber-300 text-amber-300" : "border-white/10 text-zinc-500"}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <h4 className="mt-5 font-semibold">Character changes</h4>
            <div
              data-testid="character-sync-changes"
              className="mt-2 max-h-72 divide-y divide-white/10 overflow-auto"
            >
              {rosterPreview.characterChanges
                .filter((item) => filter === "ALL" || item.status === filter)
                .map((item) => (
                  <div className="py-3 text-sm" key={item.externalId}>
                    <div className="flex justify-between">
                      <span>{item.name}</span>
                      <Badge value={item.status} />
                    </div>
                    {item.changes.length > 0 && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.changes
                          .map(
                            (change) =>
                              `${change.field}: ${change.previousValue ?? "—"} → ${change.newValue ?? "—"}`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
            </div>
            <h4 className="mt-5 font-semibold">Inventory changes</h4>
            <div
              data-testid="inventory-sync-changes"
              className="mt-2 max-h-72 divide-y divide-white/10 overflow-auto"
            >
              {rosterPreview.inventoryChanges
                .filter(
                  (item) =>
                    filter === "ALL" ||
                    item.status === filter ||
                    (filter === "UPDATE" &&
                      ["INCREASE", "DECREASE"].includes(item.status)),
                )
                .map((item) => (
                  <div
                    className="flex justify-between gap-3 py-3 text-sm"
                    key={item.externalId}
                  >
                    <span>
                      {item.name ?? item.externalId}
                      <small className="ml-2 text-zinc-600">
                        {item.category}
                      </small>
                    </span>
                    <span className="text-zinc-400">
                      {item.previousQuantity ?? "—"} → {item.newQuantity}{" "}
                      <Badge value={item.status} />
                    </span>
                  </div>
                ))}
            </div>
            <h4 className="mt-5 font-semibold">Campaign and event changes</h4>
            <div
              data-testid="progression-sync-changes"
              className="mt-2 max-h-72 divide-y divide-white/10 overflow-auto"
            >
              {[
                ...rosterPreview.campaignChanges.map((item) => ({
                  ...item,
                  kind: "Campaign",
                })),
                ...rosterPreview.eventChanges.map((item) => ({
                  ...item,
                  kind: "Event",
                })),
              ]
                .filter((item) => filter === "ALL" || item.status === filter)
                .map((item) => (
                  <div
                    className="flex justify-between gap-3 py-3 text-sm"
                    key={`${item.kind}-${item.externalKey}`}
                  >
                    <span>
                      {item.name}
                      <small className="ml-2 text-zinc-600">{item.kind}</small>
                    </span>
                    <Badge value={item.status} />
                  </div>
                ))}
            </div>
          </Panel>
        )}
        {syncResult && (
          <Panel>
            <div className="flex gap-3">
              <CheckCircle2 className="shrink-0 text-emerald-300" />
              <div>
                <h3 className="font-semibold">Sync completed</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Player state validated
                </p>
                <p className="mt-3 text-sm text-zinc-300">
                  {syncResult.synchronizedCharacterCount !== undefined
                    ? `${syncResult.synchronizedCharacterCount} synchronized characters`
                    : syncResult.rosterCount !== undefined
                      ? `${syncResult.rosterCount} total roster records`
                      : `${syncResult.unitCount} character records detected`}
                  <br />
                  {syncResult.inventoryCount ??
                    syncResult.inventoryRecordCount}{" "}
                  inventory records
                  {syncResult.campaignCount !== undefined && (
                    <>
                      <br />
                      {syncResult.campaignCount} campaign records ·{" "}
                      {syncResult.eventCount ?? 0} legendary-event records
                    </>
                  )}
                  {syncResult.upstreamLastUpdatedAt && (
                    <>
                      <br />
                      Upstream state updated:{" "}
                      {formatDate(syncResult.upstreamLastUpdatedAt)}
                    </>
                  )}
                </p>
                {syncResult.fixtureGenerated ? (
                  <p className="mt-3 text-xs text-zinc-600">
                    Sanitized development fixture generated. Existing roster
                    data was not changed.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">
                    Local priorities, notes, teams, roles, and goals were
                    preserved.{" "}
                    <Link className="text-amber-300" href="/">
                      View dashboard
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </Panel>
        )}
      </div>
      <div className="space-y-6">
        <SecurityPanel />
        <Panel>
          <h3 className="font-semibold">Recent sync runs</h3>
          {status.syncRuns.length ? (
            <div className="mt-4 divide-y divide-white/10">
              {status.syncRuns.map((run) => (
                <div
                  className="flex justify-between gap-4 py-3 text-sm"
                  key={run.id}
                >
                  <div>
                    <Badge value={run.status} />
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(run.startedAt)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    {run.recordsReceived} records
                    {run.errorMessage && (
                      <p className="mt-1 text-red-300">{run.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              No sync runs recorded yet.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function SecurityPanel() {
  return (
    <Panel>
      <ShieldCheck className="mb-3 text-amber-300" />
      <h3 className="font-semibold">Server-side credential protection</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        The key is sent only to this local server, encrypted with AES-256-GCM
        after testing, and never returned or included in roster exports.
        Confirmation is required before a durable connection is created.
      </p>
    </Panel>
  );
}
