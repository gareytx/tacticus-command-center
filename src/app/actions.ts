"use server";

import { db } from "@/lib/db";
import {
  characterSchema,
  formDataObject,
  goalSchema,
  teamMemberSchema,
  teamSchema,
} from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { regenerateRecommendations } from "@/services/recommendation.service";

function clean(formData: FormData) {
  return Object.fromEntries(
    Object.entries(formDataObject(formData)).filter(
      ([, value]) => value !== "",
    ),
  );
}

export async function saveCharacter(
  id: string | undefined,
  formData: FormData,
) {
  const parsed = characterSchema.safeParse(clean(formData));
  if (!parsed.success)
    redirect(
      `/roster/${id ? `edit/${id}` : "new"}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  const data = {
    ...parsed.data,
    portraitUrl: parsed.data.portraitUrl || null,
    notes: parsed.data.notes || null,
  };
  if (id) await db.character.update({ where: { id }, data });
  else await db.character.create({ data });
  await regenerateRecommendations();
  revalidatePath("/");
  revalidatePath("/roster");
  redirect(`/roster/${data.slug}`);
}

export async function deleteCharacter(id: string) {
  await db.character.delete({ where: { id } });
  await regenerateRecommendations();
  revalidatePath("/");
  revalidatePath("/roster");
  redirect("/roster");
}

export async function setUnitClassification(
  id: string,
  slug: string,
  formData: FormData,
) {
  const unitType = z
    .enum(["CHARACTER", "MACHINE_OF_WAR", "UNKNOWN"])
    .parse(formData.get("unitType"));
  await db.character.update({
    where: { id },
    data: {
      unitType,
      unitTypeSource: "MANUAL",
      unitTypeConfidence: "CONFIRMED",
    },
  });
  await regenerateRecommendations();
  revalidatePath("/");
  revalidatePath("/roster");
  revalidatePath(`/roster/${slug}`);
  revalidatePath("/readiness");
}

export async function saveGoal(formData: FormData) {
  const parsed = goalSchema.safeParse(clean(formData));
  if (!parsed.success)
    redirect(
      `/roster/${formData.get("characterSlug")}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  await db.upgradeGoal.create({ data: parsed.data });
  await regenerateRecommendations();
  revalidatePath("/priorities");
  revalidatePath(`/roster/${formData.get("characterSlug")}`);
  redirect("/priorities");
}

export async function updateGoalStatus(id: string, formData: FormData) {
  const status = goalSchema.shape.status.parse(formData.get("status"));
  await db.upgradeGoal.update({ where: { id }, data: { status } });
  await regenerateRecommendations();
  revalidatePath("/priorities");
}

export async function saveTeam(id: string | undefined, formData: FormData) {
  const parsed = teamSchema.safeParse(clean(formData));
  if (!parsed.success)
    redirect(
      `/teams/${id ? `${id}/edit` : "new"}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  const team = id
    ? await db.team.update({ where: { id }, data: parsed.data })
    : await db.team.create({ data: parsed.data });
  await regenerateRecommendations();
  revalidatePath("/teams");
  redirect(`/teams/${team.id}`);
}

export async function addTeamMember(formData: FormData) {
  const parsed = teamMemberSchema.safeParse(clean(formData));
  if (!parsed.success)
    redirect(
      `/teams/${formData.get("teamId")}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  const duplicate = await db.teamMember.findFirst({
    where: {
      teamId: parsed.data.teamId,
      OR: [
        { characterId: parsed.data.characterId },
        { position: parsed.data.position },
      ],
    },
  });
  if (duplicate)
    redirect(
      `/teams/${parsed.data.teamId}?error=${encodeURIComponent("That character or position is already assigned to this team.")}`,
    );
  await db.teamMember.create({ data: parsed.data });
  await regenerateRecommendations();
  revalidatePath(`/teams/${parsed.data.teamId}`);
  redirect(`/teams/${parsed.data.teamId}`);
}

export async function removeTeamMember(id: string, teamId: string) {
  await db.teamMember.delete({ where: { id } });
  await regenerateRecommendations();
  revalidatePath(`/teams/${teamId}`);
}

export async function resetDemoData() {
  await db.$transaction([
    db.teamMember.deleteMany(),
    db.upgradeGoal.deleteMany(),
    db.team.deleteMany(),
    db.character.deleteMany(),
  ]);
  const seed = [
    ["Bellator", "bellator", "Ultramarines", "IMPERIAL"],
    ["Varro Tigurius", "varro-tigurius", "Ultramarines", "IMPERIAL"],
    ["Certus", "certus", "Ultramarines", "IMPERIAL"],
    ["Azrael", "azrael", "Dark Angels", "IMPERIAL"],
    ["Dante", "dante", "Blood Angels", "IMPERIAL"],
    ["Mataneo", "mataneo", "Blood Angels", "IMPERIAL"],
    ["Aleph-Null", "aleph-null", "Necrons", "XENOS"],
    ["Anuphet", "anuphet", "Necrons", "XENOS"],
    ["Archimatos", "archimatos", "Black Legion", "CHAOS"],
    ["Haarken Worldclaimer", "haarken-worldclaimer", "Black Legion", "CHAOS"],
    ["Maugan Ra", "maugan-ra", "Aeldari", "XENOS"],
  ] as const;
  await db.character.createMany({
    data: seed.map(([name, slug, faction, alliance]) => ({
      name,
      slug,
      faction,
      alliance,
      priority: "MEDIUM" as const,
      investmentStatus: "MAINTAIN" as const,
      isOwned: true,
      unitType: "CHARACTER" as const,
      unitTypeSource: "MANUAL" as const,
      unitTypeConfidence: "CONFIRMED" as const,
      notes: "Seeded record — update unknown stats when available.",
    })),
  });
  revalidatePath("/");
  revalidatePath("/roster");
  redirect("/settings?reset=1");
}
