"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState, fieldClass, Panel } from "@/components/ui";

type CampaignRow = {
  id: string;
  displayName: string;
  normalizedType: string;
  semanticStatus: string;
  confidence: string;
  isActive: boolean | null;
  strategyScore: number;
  progress: { battleRecordCount: number } | null;
  plan: {
    priority: string;
    status: string;
    preferredTeam: { name: string } | null;
  } | null;
};
export function CampaignBrowser({ campaigns }: { campaigns: CampaignRow[] }) {
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [confidence, setConfidence] = useState("");
  const [assignment, setAssignment] = useState("");
  const [activity, setActivity] = useState("");
  const [progressStatus, setProgressStatus] = useState("");
  const [sort, setSort] = useState("SCORE");
  const rows = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          (!type || c.normalizedType === type) &&
          (!priority || c.plan?.priority === priority) &&
          (!status || (c.plan?.status ?? "NEEDS_REVIEW") === status) &&
          (!confidence || c.confidence === confidence) &&
          (!assignment ||
            (assignment === "ASSIGNED"
              ? Boolean(c.plan?.preferredTeam)
              : !c.plan?.preferredTeam)) &&
          (!activity ||
            (activity === "ACTIVE"
              ? c.isActive === true
              : activity === "INACTIVE"
                ? c.isActive === false
                : c.isActive === null)) &&
          (!progressStatus ||
            (progressStatus === "HAS_RECORDS"
              ? (c.progress?.battleRecordCount ?? 0) > 0
              : (c.progress?.battleRecordCount ?? 0) === 0)),
      ),
    [
      campaigns,
      type,
      priority,
      status,
      confidence,
      assignment,
      activity,
      progressStatus,
    ],
  );
  const select = (
    name: string,
    value: string,
    set: (v: string) => void,
    values: string[],
  ) => (
    <select
      className={fieldClass}
      aria-label={name}
      value={value}
      onChange={(e) => set(e.target.value)}
    >
      <option value="">All {name}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {v.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {select("types", type, setType, [
          "STANDARD",
          "MIRROR",
          "ELITE",
          "EVENT",
          "UNKNOWN",
        ])}
        {select("priorities", priority, setPriority, [
          "CRITICAL",
          "HIGH",
          "MEDIUM",
          "LOW",
          "HOLD",
        ])}
        {select("statuses", status, setStatus, [
          "NOT_STARTED",
          "ACTIVE",
          "BLOCKED",
          "PAUSED",
          "COMPLETED",
          "NEEDS_REVIEW",
        ])}
        {select("confidence", confidence, setConfidence, [
          "HIGH",
          "MANUAL",
          "UNKNOWN",
        ])}
        {select("assignment", assignment, setAssignment, [
          "ASSIGNED",
          "UNASSIGNED",
        ])}
        {select("activity", activity, setActivity, [
          "ACTIVE",
          "INACTIVE",
          "UNKNOWN",
        ])}
        {select("progress", progressStatus, setProgressStatus, [
          "HAS_RECORDS",
          "NO_RECORDS",
        ])}
        {select("sort", sort, setSort, ["SCORE", "NAME", "TYPE"])}
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        {rows.length} campaign records · sorted by strategy score
      </p>
      {!rows.length ? (
        <EmptyState
          title="No matching campaigns"
          description="Clear a filter or synchronize campaign progress."
        />
      ) : (
        <div className="space-y-3">
          {rows
            .sort((a, b) =>
              sort === "NAME"
                ? a.displayName.localeCompare(b.displayName)
                : sort === "TYPE"
                  ? a.normalizedType.localeCompare(b.normalizedType) ||
                    a.displayName.localeCompare(b.displayName)
                  : b.strategyScore - a.strategyScore ||
                    a.displayName.localeCompare(b.displayName),
            )
            .map((c) => (
              <Panel key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      className="font-semibold text-amber-300"
                      href={`/campaigns/${c.id}`}
                    >
                      {c.displayName}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {c.progress?.battleRecordCount ?? 0} exposed battle
                      records ·{" "}
                      {c.plan?.preferredTeam?.name ?? "No preferred team"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge value={c.normalizedType} />
                    <Badge value={c.plan?.status ?? "NEEDS_REVIEW"} />
                    <Badge value={c.semanticStatus} />
                    <span className="font-mono text-xs text-zinc-500">
                      score {c.strategyScore}
                    </span>
                  </div>
                </div>
              </Panel>
            ))}
        </div>
      )}
    </>
  );
}
