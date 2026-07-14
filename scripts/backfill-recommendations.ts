import { db } from "../src/lib/db";
import { regenerateRecommendations } from "../src/services/recommendation.service";
regenerateRecommendations()
  .then((result) =>
    console.log(
      JSON.stringify(
        {
          activeCount: result.activeCount,
          created: result.created,
          updated: result.updated,
          superseded: result.superseded,
          stale: result.stale,
          suppressed: result.suppressed,
          rejected: result.rejected,
          advisorCounts: result.advisorCounts,
        },
        null,
        2,
      ),
    ),
  )
  .finally(() => db.$disconnect());
