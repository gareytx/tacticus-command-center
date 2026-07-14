import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  applyRecommendationAction,
  regenerateRecommendations,
} from "../../src/services/recommendation.service";
import { saveRecommendationFeedback } from "../../src/services/recommendation-feedback.service";
const db = new PrismaClient();
test.beforeAll(async () => {
  await regenerateRecommendations();
});
test.afterAll(async () => db.$disconnect());
test("generation is idempotent and lifecycle follows material evidence", async () => {
  const unit = await db.character.create({
    data: {
      name: "Recommendation Test Unit",
      slug: "recommendation-test-unit",
      faction: "Local test",
      alliance: "IMPERIAL",
      unitType: "UNKNOWN",
      priority: "MEDIUM",
      investmentStatus: "MAINTAIN",
    },
  });
  const first = await regenerateRecommendations();
  const second = await regenerateRecommendations();
  expect(second.created).toBe(0);
  expect(second.updated).toBe(first.activeCount);
  const recommendation = await db.recommendation.findFirstOrThrow({
    where: {
      targetEntityType: "CHARACTER",
      targetEntityId: unit.id,
      status: "ACTIVE",
    },
  });
  await applyRecommendationAction({
    recommendationId: recommendation.id,
    action: "DISMISS",
  });
  await regenerateRecommendations();
  expect(
    await db.recommendation.findUnique({ where: { id: recommendation.id } }),
  ).toMatchObject({ status: "DISMISSED" });
  await saveRecommendationFeedback({
    recommendationId: recommendation.id,
    response: "HELPFUL",
    note: "Lifecycle integration evidence",
  });
  await db.character.update({
    where: { id: unit.id },
    data: { priority: "HIGH" },
  });
  await regenerateRecommendations();
  expect(
    await db.recommendation.findUnique({ where: { id: recommendation.id } }),
  ).toMatchObject({ status: "SUPERSEDED" });
  expect(
    await db.recommendation.count({
      where: {
        targetEntityId: unit.id,
        status: "ACTIVE",
      },
    }),
  ).toBe(1);
  expect(
    await db.recommendationFeedback.count({
      where: { recommendationId: recommendation.id },
    }),
  ).toBe(1);
  await db.character.delete({ where: { id: unit.id } });
  await regenerateRecommendations();
});
test("campaign plans, goals, and team assignments regenerate recommendations", async () => {
  const character = await db.character.findFirstOrThrow({
    where: { slug: "bellator" },
  });
  const team = await db.team.create({
    data: { name: "Recommendation test team", mode: "OTHER" },
  });
  const campaign = await db.campaignDefinition.create({
    data: {
      externalKey: "recommendation-test-campaign",
      externalCampaignId: "recommendation-test-campaign",
      displayName: "Recommendation test campaign",
      upstreamType: "test",
      normalizedType: "STANDARD",
      typeSource: "LOCAL_TEST",
      confidence: "MANUAL",
      semanticStatus: "PARTIAL",
      lastSyncedAt: new Date(),
      plan: {
        create: {
          status: "ACTIVE",
          priority: "HIGH",
          currentObjective: "Review the saved local objective",
          preferredTeamId: team.id,
        },
      },
    },
  });
  await regenerateRecommendations();
  expect(
    await db.recommendation.count({
      where: {
        targetEntityId: campaign.id,
        type: "ASSIGN_TEAM",
        status: "ACTIVE",
      },
    }),
  ).toBe(1);
  expect(
    await db.recommendation.count({
      where: {
        targetEntityId: campaign.id,
        type: "ADVANCE_CAMPAIGN_GOAL",
        status: "ACTIVE",
      },
    }),
  ).toBe(1);
  await db.teamMember.create({
    data: { teamId: team.id, characterId: character.id, position: 1 },
  });
  await regenerateRecommendations();
  expect(
    await db.recommendation.count({
      where: {
        targetEntityId: campaign.id,
        type: "ASSIGN_TEAM",
        status: "ACTIVE",
      },
    }),
  ).toBe(0);
  const goal = await db.upgradeGoal.create({
    data: {
      characterId: character.id,
      targetCharacterLevel: 20,
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      reason: "Recommendation regeneration test",
    },
  });
  await regenerateRecommendations();
  expect(
    await db.recommendation.count({
      where: {
        targetEntityId: goal.id,
        type: "COMPLETE_ACTIVE_GOAL",
        status: "ACTIVE",
      },
    }),
  ).toBe(1);
  await db.campaignPlan.update({
    where: { campaignId: campaign.id },
    data: { blockerSummary: "Locally entered test blocker" },
  });
  await regenerateRecommendations();
  expect(
    await db.recommendation.count({
      where: {
        targetEntityId: campaign.id,
        type: "REVIEW_CAMPAIGN_BLOCKER",
        status: "ACTIVE",
      },
    }),
  ).toBe(1);
  await db.upgradeGoal.delete({ where: { id: goal.id } });
  await db.campaignDefinition.delete({ where: { id: campaign.id } });
  await db.team.delete({ where: { id: team.id } });
  await regenerateRecommendations();
});
test("recommendations, detail, lifecycle, feedback, brief controls, and dashboard links work", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/recommendations");
  await expect(
    page.getByRole("heading", { name: "Strategic recommendations" }),
  ).toBeVisible();
  await page.getByLabel("status").selectOption("ACTIVE");
  const first = page
    .locator("section")
    .filter({ has: page.getByText("Refresh synchronized account evidence") })
    .first();
  await expect(first).toBeVisible();
  await first
    .getByRole("link", { name: "Refresh synchronized account evidence" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recommendation evidence" }),
  ).toBeVisible();
  await expect(page.getByText("Structured evidence")).toBeVisible();
  await page.getByText("Provide feedback").click();
  await page.getByLabel("Feedback response").selectOption("HELPFUL");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Feedback history" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await page.goto("/recommendations");
  await page.getByLabel("status").selectOption("DISMISSED");
  await expect(
    page.getByText("Refresh synchronized account evidence"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await page.getByLabel("status").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Snooze Tomorrow" }).click();
  await page.getByLabel("status").selectOption("SNOOZED");
  await expect(
    page.getByText("Refresh synchronized account evidence"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await page.goto("/brief");
  await expect(
    page.getByRole("heading", { name: "What should I work on next?" }),
  ).toBeVisible();
  await expect(page.getByText("PRIMARY FOCUS")).toBeVisible();
  await page.getByLabel("Available play time").selectOption("30");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("30m")).toBeVisible();
  await page.getByLabel("Strategic objective target").selectOption("GENERAL");
  await page
    .locator('input[name="objectiveLabel"]')
    .fill("General account development");
  await page.getByRole("button", { name: "Save objective" }).click();
  await page.getByRole("button", { name: "Enable reflection" }).click();
  await expect(page.getByText("OPTIONAL REFLECTION")).toBeVisible();
  await expect(page.getByText("Show another reflection")).toBeVisible();
  await page.getByRole("button", { name: "Disable reflection" }).click();
  await page.goto("/");
  await expect(page.getByTestId("recommendation-summary")).toBeVisible();
  await page.getByRole("link", { name: "Review →" }).click();
  await expect(
    page.getByRole("heading", { name: "Strategic recommendations" }),
  ).toBeVisible();
});
