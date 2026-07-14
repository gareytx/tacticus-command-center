"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { regenerateRecommendations } from "@/services/recommendation.service";

const schema = z.object({
  eventId: z.string().min(1),
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
export async function saveEventPlan(formData: FormData) {
  const value = schema.parse(Object.fromEntries(formData));
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
  const previous = await db.eventPlan.findUnique({
    where: { eventId: value.eventId },
  });
  const plan = await db.eventPlan.upsert({
    where: { eventId: value.eventId },
    create: { eventId: value.eventId, ...data },
    update: data,
  });
  for (const [field, next] of Object.entries(data)) {
    const before = previous?.[field as keyof typeof previous] ?? null;
    if (String(before ?? "") !== String(next ?? ""))
      await db.eventPlanChange.create({
        data: {
          eventPlanId: plan.id,
          field,
          previousValue: before === null ? null : String(before),
          newValue: next === null ? null : String(next),
        },
      });
  }
  await regenerateRecommendations();
  revalidatePath(`/events/${value.eventId}`);
  revalidatePath("/events");
  revalidatePath("/brief");
}

const classificationSchema = z.object({
  eventId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  eventType: z.enum([
    "LEGENDARY_EVENT",
    "CAMPAIGN_EVENT",
    "QUEST",
    "SURVIVAL",
    "INCURSION",
    "UNKNOWN",
  ]),
});
export async function saveEventClassification(formData: FormData) {
  const value = classificationSchema.parse(Object.fromEntries(formData));
  await db.eventDefinition.update({
    where: { id: value.eventId },
    data: {
      displayName: value.displayName,
      displayNameSource: "MANUAL",
      eventType: value.eventType,
      typeSource: "MANUAL",
      confidence: "MANUAL",
    },
  });
  await regenerateRecommendations();
  revalidatePath(`/events/${value.eventId}`);
  revalidatePath("/events");
}
