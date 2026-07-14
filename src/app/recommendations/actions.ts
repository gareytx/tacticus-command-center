"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  applyRecommendationAction,
  regenerateRecommendations,
} from "@/services/recommendation.service";
import { saveRecommendationFeedback } from "@/services/recommendation-feedback.service";

const refresh = (recommendationId?: string) => {
  revalidatePath("/");
  revalidatePath("/recommendations");
  revalidatePath("/brief");
  if (recommendationId) revalidatePath(`/recommendations/${recommendationId}`);
};
export async function rebuildRecommendations() {
  await regenerateRecommendations();
  refresh();
}
export async function recommendationAction(formData: FormData) {
  const recommendationId = String(formData.get("recommendationId") ?? "");
  await applyRecommendationAction({
    recommendationId,
    action: formData.get("action"),
  });
  refresh(recommendationId);
}
export async function recommendationFeedback(formData: FormData) {
  const recommendationId = String(formData.get("recommendationId") ?? "");
  await saveRecommendationFeedback({
    recommendationId,
    response: formData.get("response"),
    note: formData.get("note"),
  });
  refresh(recommendationId);
  redirect(`/recommendations/${recommendationId}`);
}

const settingsSchema = z.object({
  objectiveKey: z.string().max(200),
  objectiveLabel: z.string().max(200).optional(),
});
export async function saveStrategicObjective(formData: FormData) {
  const value = settingsSchema.parse(Object.fromEntries(formData));
  let objectiveEntityType: string | null = null,
    objectiveEntityId: string | null = null,
    objectiveType = "GENERAL";
  if (value.objectiveKey && value.objectiveKey !== "GENERAL") {
    const [type, id] = value.objectiveKey.split(":", 2);
    if (!type || !id) throw new Error("Invalid strategic objective");
    const exists =
      type === "CHARACTER"
        ? await db.character.count({ where: { id } })
        : type === "CAMPAIGN"
          ? await db.campaignDefinition.count({ where: { id } })
          : type === "EVENT"
            ? await db.eventDefinition.count({ where: { id } })
            : type === "UPGRADE_GOAL"
              ? await db.upgradeGoal.count({ where: { id } })
              : 0;
    if (!exists) throw new Error("Strategic objective target not found");
    objectiveEntityType = type;
    objectiveEntityId = id;
    objectiveType = "TARGETED";
  }
  await db.strategicSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      objectiveType,
      objectiveEntityType,
      objectiveEntityId,
      objectiveLabel: value.objectiveLabel?.trim() || null,
    },
    update: {
      objectiveType,
      objectiveEntityType,
      objectiveEntityId,
      objectiveLabel: value.objectiveLabel?.trim() || null,
    },
  });
  await regenerateRecommendations();
  refresh();
}
export async function saveTimeBudget(formData: FormData) {
  const selected = String(formData.get("timeBudget") ?? "");
  const preferred = z.coerce
    .number()
    .int()
    .min(10)
    .max(180)
    .parse(selected === "CUSTOM" ? formData.get("customTimeBudget") : selected);
  await db.strategicSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      preferredTimeBudget: preferred,
      customTimeBudget: selected === "CUSTOM" ? preferred : null,
    },
    update: {
      preferredTimeBudget: preferred,
      customTimeBudget: selected === "CUSTOM" ? preferred : null,
    },
  });
  revalidatePath("/brief");
}
export async function toggleReflection(formData: FormData) {
  const enabled = formData.get("enabled") === "true";
  await db.strategicSettings.upsert({
    where: { id: "default" },
    create: { id: "default", reflectionEnabled: enabled },
    update: { reflectionEnabled: enabled },
  });
  revalidatePath("/brief");
}
export async function showAnotherReflection() {
  const current = await db.strategicSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  await db.strategicSettings.update({
    where: { id: "default" },
    data: { reflectionIndex: current.reflectionIndex + 1 },
  });
  revalidatePath("/brief");
}
