import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { RecommendationDetail } from "@/components/recommendations/recommendation-detail";
import { getRecommendation } from "@/services/recommendation.service";
export default async function RecommendationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const r = await getRecommendation(id);
  if (!r) notFound();
  return (
    <>
      <PageHeader
        eyebrow={r.advisorSource}
        title="Recommendation evidence"
        description="A reproducible explanation of the local facts and strategy behind this action."
      />
      <RecommendationDetail
        recommendation={{ ...r, generatedAt: r.generatedAt.toISOString() }}
        explanation={r.explanation}
        evidence={JSON.parse(r.evidenceJson)}
        feedback={r.feedback.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
