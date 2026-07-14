import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const seedCharacters = [
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
async function main() {
  for (const [name, slug, faction, alliance] of seedCharacters)
    await db.character.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        faction,
        alliance,
        priority: "MEDIUM",
        investmentStatus: "MAINTAIN",
        isOwned: true,
        notes: "Seeded record — update unknown stats when available.",
      },
    });
}
main().finally(() => db.$disconnect());
