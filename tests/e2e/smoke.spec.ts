import { test, expect } from "@playwright/test";
test("dashboard, roster, and seeded character load", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Roster readiness" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Roster", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Character roster" }),
  ).toBeVisible();
  await page
    .getByTestId("character-card")
    .filter({ hasText: "Bellator" })
    .click();
  await expect(page.getByRole("heading", { name: "Bellator" })).toBeVisible();
  await page
    .getByRole("link", { name: "Readiness", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Upgrade readiness" }),
  ).toBeVisible();
  await expect(page.getByText("Resource pressure")).toBeVisible();
});
