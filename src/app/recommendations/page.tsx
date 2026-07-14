import { connection } from "next/server";
import { PageHeader, Panel, Stat } from "@/components/ui";
import { RecommendationFilters } from "@/components/recommendations/recommendation-filters";
import { listRecommendations } from "@/services/recommendation.service";
import { rebuildRecommendations } from "./actions";
export default async function RecommendationsPage() {
  await connection();
  const recommendations = await listRecommendations();
  const active = recommendations.filter((r) => r.status === "ACTIVE");
  return (
    <>
      <PageHeader
        eyebrow="Phase 3A"
        title="Strategic recommendations"
        description="Evidence-backed local planning actions. Scores are not global ratings or battle-success predictions."
        action={
          <form action={rebuildRecommendations}>
            <button className="border border-amber-300 bg-amber-300 px-4 py-2 text-sm text-black">
              Rebuild recommendations
            </button>
          </form>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Panel>
          <Stat label="Active" value={active.length} accent />
        </Panel>
        <Panel>
          <Stat
            label="Exact + high"
            value={
              active.filter((r) => ["EXACT", "HIGH"].includes(r.confidence))
                .length
            }
          />
        </Panel>
        <Panel>
          <Stat
            label="Review required"
            value={
              active.filter((r) =>
                ["DATA_QUALITY", "REVIEW"].includes(r.advisorSource),
              ).length
            }
          />
        </Panel>
        <Panel>
          <Stat
            label="Snoozed"
            value={recommendations.filter((r) => r.status === "SNOOZED").length}
          />
        </Panel>
      </div>
      <RecommendationFilters
        recommendations={recommendations.map((r) => ({
          ...r,
          generatedAt: r.generatedAt.toISOString(),
        }))}
      />
    </>
  );
}
