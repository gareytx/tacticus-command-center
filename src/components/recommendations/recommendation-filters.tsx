"use client";
import { useMemo, useState } from "react";
import { fieldClass } from "@/components/ui";
import {
  RecommendationCard,
  type RecommendationView,
} from "./recommendation-card";
export function RecommendationFilters({
  recommendations,
}: {
  recommendations: RecommendationView[];
}) {
  const [status, setStatus] = useState("ACTIVE"),
    [type, setType] = useState(""),
    [confidence, setConfidence] = useState(""),
    [advisor, setAdvisor] = useState(""),
    [priority, setPriority] = useState(""),
    [target, setTarget] = useState("");
  const rows = useMemo(
    () =>
      recommendations.filter(
        (r) =>
          (!status || r.status === status) &&
          (!type || r.type === type) &&
          (!confidence || r.confidence === confidence) &&
          (!advisor || r.advisorSource === advisor) &&
          (!target || r.targetEntityType === target) &&
          (!priority ||
            (priority === "HIGH" && r.priorityScore >= 500) ||
            (priority === "MEDIUM" &&
              r.priorityScore >= 300 &&
              r.priorityScore < 500) ||
            (priority === "LOW" && r.priorityScore < 300)),
      ),
    [recommendations, status, type, confidence, advisor, priority, target],
  );
  const select = (
    label: string,
    value: string,
    set: (v: string) => void,
    values: string[],
  ) => (
    <select
      aria-label={label}
      className={fieldClass}
      value={value}
      onChange={(e) => set(e.target.value)}
    >
      <option value="">All {label}</option>
      {values.map((v) => (
        <option key={v}>{v}</option>
      ))}
    </select>
  );
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {select("status", status, setStatus, [
          "ACTIVE",
          "SNOOZED",
          "DISMISSED",
          "COMPLETED",
          "STALE",
          "SUPERSEDED",
        ])}
        {select("type", type, setType, [
          ...new Set(recommendations.map((r) => r.type)),
        ])}
        {select("confidence", confidence, setConfidence, [
          "EXACT",
          "HIGH",
          "MANUAL",
          "HEURISTIC",
        ])}
        {select("advisor", advisor, setAdvisor, [
          ...new Set(recommendations.map((r) => r.advisorSource)),
        ])}
        {select("priority", priority, setPriority, ["HIGH", "MEDIUM", "LOW"])}
        {select("target", target, setTarget, [
          ...new Set(
            recommendations
              .map((r) => r.targetEntityType)
              .filter((v): v is string => Boolean(v)),
          ),
        ])}
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        {rows.length} matching recommendations
      </p>
      <div className="space-y-3">
        {rows.map((r) => (
          <RecommendationCard key={r.id} recommendation={r} />
        ))}
      </div>
    </>
  );
}
