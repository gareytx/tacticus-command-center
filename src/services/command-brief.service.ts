import { db } from "@/lib/db";
import { visibleForBudget } from "@/lib/recommendations/lifecycle";
export const REFLECTIONS = [
  {
    reference: "Colossians 3:23",
    excerpt: "Work heartily, as for the Lord.",
    reflection:
      "Bring steady care to the next faithful task; the value is in how you approach it, not merely the result.",
  },
  {
    reference: "Proverbs 16:3",
    excerpt: "Commit your work to the Lord.",
    reflection:
      "Planning is useful when it releases anxiety and clarifies the good work immediately in front of you.",
  },
  {
    reference: "James 1:5",
    excerpt: "If any of you lacks wisdom, let him ask God.",
    reflection:
      "A pause for wisdom can be more productive than rushing into the loudest available action.",
  },
  {
    reference: "Psalm 90:17",
    excerpt: "Establish the work of our hands.",
    reflection:
      "Small, deliberate choices can become durable progress when they are made with patience and purpose.",
  },
  {
    reference: "1 Corinthians 10:31",
    excerpt: "Do all to the glory of God.",
    reflection:
      "Even recreation can be received gratefully and practiced with balance, attention, and integrity.",
  },
  {
    reference: "Ecclesiastes 9:10",
    excerpt: "Whatever your hand finds to do, do it with your might.",
    reflection:
      "Give the chosen task your full attention, then let the rest wait without guilt.",
  },
] as const;
export async function getCommandBrief(budgetOverride?: number) {
  const [settings, connection, recommendations] = await Promise.all([
    db.strategicSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    }),
    db.tacticusConnection.findFirst(),
    db.recommendation.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ priorityScore: "desc" }, { generatedAt: "desc" }],
    }),
  ]);
  const budget =
    budgetOverride ?? settings.customTimeBudget ?? settings.preferredTimeBudget;
  const eligible = recommendations.filter((r) =>
    visibleForBudget(r.durationCategory, budget),
  );
  const primary = eligible[0] ?? recommendations[0] ?? null;
  return {
    settings,
    connection,
    budget,
    recommendations,
    eligible,
    primary,
    next: eligible.filter((r) => r.id !== primary?.id).slice(0, 5),
    campaign: eligible.find((r) => r.targetEntityType === "CAMPAIGN") ?? null,
    event: eligible.find((r) => r.targetEntityType === "EVENT") ?? null,
    resource:
      eligible.find((r) => r.targetEntityType === "RESOURCE_CATEGORY") ?? null,
    review: eligible
      .filter((r) => ["DATA_QUALITY", "REVIEW"].includes(r.advisorSource))
      .slice(0, 5),
    waiting: recommendations
      .filter((r) => !eligible.some((e) => e.id === r.id))
      .slice(0, 5),
    reflection: REFLECTIONS[settings.reflectionIndex % REFLECTIONS.length],
  };
}
