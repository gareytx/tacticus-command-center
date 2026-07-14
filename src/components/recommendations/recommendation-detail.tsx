import { Badge, Panel } from "@/components/ui";
import { EvidenceList, type SafeEvidence } from "./evidence-list";
import { RecommendationActions } from "./recommendation-actions";
import type { RecommendationView } from "./recommendation-card";
export function RecommendationDetail({
  recommendation,
  evidence,
  explanation,
  feedback,
}: {
  recommendation: RecommendationView;
  evidence: SafeEvidence[];
  explanation: string | null;
  feedback: Array<{
    id: string;
    response: string;
    note: string | null;
    createdAt: string;
  }>;
}) {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{recommendation.title}</h1>
            <p className="mt-2 text-zinc-300">{recommendation.summary}</p>
          </div>
          <div className="flex gap-2">
            <Badge value={recommendation.confidence} />
            <Badge value={recommendation.status} />
            <span className="font-mono text-amber-300">
              {recommendation.priorityScore}
            </span>
          </div>
        </div>
        {explanation && (
          <p className="mt-4 text-sm leading-6 text-zinc-400">{explanation}</p>
        )}
        <p className="mt-4 text-xs text-zinc-500">
          {recommendation.limitations}
        </p>
        <RecommendationActions
          id={recommendation.id}
          status={recommendation.status}
        />
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-semibold">Structured evidence</h2>
        <EvidenceList evidence={evidence} />
      </Panel>
      {feedback.length > 0 && (
        <Panel>
          <h2 className="font-semibold">Feedback history</h2>
          <div className="mt-3 divide-y divide-white/10">
            {feedback.map((f) => (
              <p key={f.id} className="py-2 text-sm">
                <Badge value={f.response} />{" "}
                <span className="ml-2 text-zinc-400">
                  {f.note ?? "No note"}
                </span>
                <span className="float-right text-xs text-zinc-600">
                  {new Date(f.createdAt).toLocaleString()}
                </span>
              </p>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
