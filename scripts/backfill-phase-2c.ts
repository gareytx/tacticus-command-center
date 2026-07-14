import { PrismaClient } from "@prisma/client";
import { classifyUnit } from "../src/lib/readiness/unit-classification";
import { classifyInventory } from "../src/lib/readiness/inventory-taxonomy";

const db = new PrismaClient();

async function main() {
  const [characters, inventory] = await Promise.all([
    db.character.findMany(),
    db.inventoryItem.findMany(),
  ]);
  for (const character of characters) {
    if (character.unitTypeSource === "MANUAL") continue;
    const value = classifyUnit(character.externalCharacterId);
    await db.character.update({
      where: { id: character.id },
      data: {
        unitType: value.unitType,
        unitTypeSource: value.source,
        unitTypeConfidence: value.confidence,
      },
    });
  }
  for (const item of inventory) {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = item.upstreamMetadataJson
        ? JSON.parse(item.upstreamMetadataJson)
        : {};
    } catch {}
    const value = classifyInventory({
      externalId: item.externalInventoryId,
      displayName: item.displayName,
      category: item.category,
      rarity: item.rarity,
      metadata,
    });
    await db.inventoryItem.update({ where: { id: item.id }, data: value });
  }
  const counts = await db.character.groupBy({ by: ["unitType"], _count: true });
  const unknownInventory = await db.inventoryItem.count({
    where: { resourceType: "UNKNOWN" },
  });
  console.log(
    `Classified ${characters.length} units and ${inventory.length} inventory records.`,
  );
  console.log(
    `Unit split: ${counts.map((item) => `${item.unitType}=${item._count}`).join(", ")}. Unknown inventory: ${unknownInventory}.`,
  );
}

main().finally(() => db.$disconnect());
