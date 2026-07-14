import { db } from "@/lib/db";
import { analyzeBottlenecks } from "@/lib/readiness/bottleneck-analysis";
import { evaluateReadiness } from "@/lib/readiness/readiness-engine";

export async function getReadinessView() {
  const [characters, inventory, verifications] = await Promise.all([
    db.character.findMany({
      where: { isOwned: true },
      orderBy: { name: "asc" },
      include: { upgradeGoals: true },
    }),
    db.inventoryItem.findMany(),
    db.readinessVerification.findMany(),
  ]);
  const opportunities = characters
    .flatMap((character) =>
      evaluateReadiness({
        ...character,
        activeGoal: character.upgradeGoals.some(
          (goal) => !["COMPLETED", "CANCELLED"].includes(goal.status),
        ),
      }),
    )
    .map((item) => ({
      ...item,
      verification:
        verifications.find((v) => v.key === item.key)?.status ?? "NEEDS_REVIEW",
      verificationNote:
        verifications.find((v) => v.key === item.key)?.note ?? null,
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.characterName.localeCompare(b.characterName),
    );
  return {
    counts: {
      characters: characters.filter((c) => c.unitType === "CHARACTER").length,
      machines: characters.filter((c) => c.unitType === "MACHINE_OF_WAR")
        .length,
      unknown: characters.filter((c) => c.unitType === "UNKNOWN").length,
      exact: opportunities.filter((o) => o.confidence === "EXACT").length,
    },
    opportunities,
    machines: characters
      .filter((c) => c.unitType === "MACHINE_OF_WAR")
      .map((c) => ({ id: c.id, name: c.name, alliance: c.alliance })),
    unknownUnits: characters
      .filter((c) => c.unitType === "UNKNOWN")
      .map((c) => ({
        id: c.id,
        name: c.name,
        externalId: c.externalCharacterId,
      })),
    bottlenecks: analyzeBottlenecks(inventory),
  };
}
