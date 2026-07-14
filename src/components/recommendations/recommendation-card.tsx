import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { ConfidenceBadge } from "./confidence-badge";
import { RecommendationActions } from "./recommendation-actions";
export type RecommendationView = {
  id: string;
  type: string;
  advisorSource: string;
  status: string;
  confidence: string;
  priorityScore: number;
  durationCategory: string;
  title: string;
  summary: string;
  limitations: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  targetLabel: string | null;
  generatedAt: string;
};
const targetHref = (r: RecommendationView) =>
  r.targetEntityType === "CHARACTER"
    ? `/roster/edit/${r.targetEntityId}`
    : r.targetEntityType === "CAMPAIGN"
      ? `/campaigns/${r.targetEntityId}`
      : r.targetEntityType === "EVENT"
        ? `/events/${r.targetEntityId}`
        : null;
export function RecommendationCard({
  recommendation,
  actions = true,
}: {
  recommendation: RecommendationView;
  actions?: boolean;
}) {
  const href = targetHref(recommendation);
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/recommendations/${recommendation.id}`}
            className="text-lg font-semibold text-amber-300"
          >
            {recommendation.title}
          </Link>
          <p className="mt-2 text-sm text-zinc-300">{recommendation.summary}</p>
          <p className="mt-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Why it matters
          </p>
          {recommendation.targetLabel && (
            <p className="mt-2 text-xs text-zinc-500">
              Target:{" "}
              {href ? (
                <Link href={href} className="hover:text-amber-300">
                  {recommendation.targetLabel}
                </Link>
              ) : (
                recommendation.targetLabel
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="font-mono text-sm text-amber-300">
            {recommendation.priorityScore}
          </span>
          <ConfidenceBadge confidence={recommendation.confidence} />
          <Badge value={recommendation.status} />
          <Badge value={recommendation.durationCategory} />
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Advisor: {recommendation.advisorSource} · Generated{" "}
        {new Date(recommendation.generatedAt).toLocaleString()}
      </p>
      {recommendation.limitations && (
        <p className="mt-3 border-l-2 border-amber-300/30 pl-3 text-xs leading-5 text-zinc-500">
          Limitation: {recommendation.limitations}
        </p>
      )}
      {actions && (
        <RecommendationActions
          id={recommendation.id}
          status={recommendation.status}
        />
      )}
    </Panel>
  );
}
