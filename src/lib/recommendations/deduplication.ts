import { createHash } from "node:crypto";
import type { RecommendationCandidate } from "./types";
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
};
export function lifecycleKey(c: RecommendationCandidate) {
  return [
    c.advisorSource,
    c.type,
    c.targetEntityType ?? "NONE",
    c.targetEntityId ?? "NONE",
  ].join("::");
}
export function fingerprintCandidate(c: RecommendationCandidate) {
  const materialEvidence = c.evidence.map((evidence) =>
    Object.fromEntries(
      Object.entries(evidence).filter(([key]) => key !== "sourceTimestamp"),
    ),
  );
  return createHash("sha256")
    .update(
      stable({
        lifecycleKey: lifecycleKey(c),
        confidence: c.confidence,
        evidence: materialEvidence,
        strategyPriority: c.strategyPriority,
        investmentStatus: c.investmentStatus,
        goalPriority: c.goalPriority,
        goalStatus: c.goalStatus,
        deadline: c.deadline?.toISOString() ?? null,
      }),
    )
    .digest("hex");
}
export function deduplicateCandidates<T extends RecommendationCandidate>(
  items: T[],
) {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = fingerprintCandidate(item);
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}
