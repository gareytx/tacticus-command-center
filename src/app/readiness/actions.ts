"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { regenerateRecommendations } from "@/services/recommendation.service";

const schema = z.object({
  key: z.string().min(3),
  characterId: z.string().min(1),
  opportunityType: z.string().min(1),
  status: z.enum(["VERIFIED", "NOT_APPLICABLE", "NEEDS_REVIEW"]),
  note: z.string().max(500).optional(),
});

export async function saveReadinessVerification(formData: FormData) {
  const parsed = schema.parse(Object.fromEntries(formData));
  await db.readinessVerification.upsert({
    where: { key: parsed.key },
    create: { ...parsed, note: parsed.note || null },
    update: { status: parsed.status, note: parsed.note || null },
  });
  await regenerateRecommendations();
  revalidatePath("/readiness");
}
