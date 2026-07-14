import { ConfidenceBadge } from "./confidence-badge";
export type SafeEvidence = {
  evidenceType: string;
  sourceEntityType: string;
  sourceEntityId: string | null;
  sourceField: string;
  observedValue: string | number | boolean | null;
  comparisonValue?: string | number | boolean | null;
  sourceTimestamp: string | null;
  confidence: string;
  explanation: string;
};
export function EvidenceList({ evidence }: { evidence: SafeEvidence[] }) {
  return (
    <div className="space-y-3">
      {evidence.map((item, index) => (
        <div
          className="border border-white/10 p-4"
          key={`${item.evidenceType}-${index}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-zinc-400">
              {item.evidenceType} · {item.sourceEntityType}.{item.sourceField}
            </p>
            <ConfidenceBadge confidence={item.confidence} />
          </div>
          <p className="mt-2 text-sm text-zinc-300">
            Observed: {String(item.observedValue ?? "Unknown")}
            {item.comparisonValue !== undefined
              ? ` · Compared with ${String(item.comparisonValue ?? "Unknown")}`
              : ""}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {item.explanation}
          </p>
          {item.sourceTimestamp && (
            <p className="mt-1 text-[10px] text-zinc-600">
              Source time: {new Date(item.sourceTimestamp).toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
