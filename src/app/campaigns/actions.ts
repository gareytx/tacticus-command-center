"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const planSchema = z.object({
  campaignId: z.string().min(1),
  status: z.enum([
    "NOT_STARTED",
    "ACTIVE",
    "BLOCKED",
    "PAUSED",
    "COMPLETED",
    "NEEDS_REVIEW",
  ]),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "HOLD"]),
  currentObjective: z.string().max(500).optional(),
  targetObjective: z.string().max(500).optional(),
  blockerSummary: z.string().max(500).optional(),
  strategyNotes: z.string().max(2000).optional(),
  preferredTeamId: z.string().optional(),
  targetDate: z.string().optional(),
});

export async function saveCampaignPlan(formData: FormData) {
  const value = planSchema.parse(Object.fromEntries(formData));
  const data = {
    status: value.status,
    priority: value.priority,
    currentObjective: value.currentObjective || null,
    targetObjective: value.targetObjective || null,
    blockerSummary: value.blockerSummary || null,
    strategyNotes: value.strategyNotes || null,
    preferredTeamId: value.preferredTeamId || null,
    targetDate: value.targetDate
      ? new Date(`${value.targetDate}T12:00:00Z`)
      : null,
  };
  const previous = await db.campaignPlan.findUnique({
    where: { campaignId: value.campaignId },
  });
  const plan = await db.campaignPlan.upsert({
    where: { campaignId: value.campaignId },
    create: { campaignId: value.campaignId, ...data },
    update: data,
  });
  for (const [field, next] of Object.entries(data)) {
    const before = previous?.[field as keyof typeof previous] ?? null;
    if (String(before ?? "") !== String(next ?? ""))
      await db.campaignPlanChange.create({
        data: {
          campaignPlanId: plan.id,
          field,
          previousValue: before === null ? null : String(before),
          newValue: next === null ? null : String(next),
        },
      });
  }
  revalidatePath(`/campaigns/${value.campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/brief");
}

const classificationSchema = z.object({
  campaignId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  normalizedType: z.enum(["STANDARD", "MIRROR", "ELITE", "EVENT", "UNKNOWN"]),
});
export async function saveCampaignClassification(formData: FormData) {
  const value = classificationSchema.parse(Object.fromEntries(formData));
  await db.campaignDefinition.update({
    where: { id: value.campaignId },
    data: {
      displayName: value.displayName,
      displayNameSource: "MANUAL",
      normalizedType: value.normalizedType,
      typeSource: "MANUAL",
      confidence: "MANUAL",
    },
  });
  revalidatePath(`/campaigns/${value.campaignId}`);
  revalidatePath("/campaigns");
}
