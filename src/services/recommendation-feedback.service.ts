import { db } from "@/lib/db";
import { feedbackSchema } from "@/lib/recommendations/schemas";
export async function saveRecommendationFeedback(input: unknown) {
  const value = feedbackSchema.parse(input);
  await db.recommendation.findUniqueOrThrow({
    where: { id: value.recommendationId },
  });
  return db.recommendationFeedback.create({
    data: {
      recommendationId: value.recommendationId,
      response: value.response,
      note: value.note?.trim() || null,
    },
  });
}
