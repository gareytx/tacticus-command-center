import { db } from "@/lib/db";
import { buildExport } from "@/lib/import-export";

export const rosterRepository = {
  characters: () =>
    db.character.findMany({
      orderBy: { name: "asc" },
      include: { upgradeGoals: true, teamMembers: { include: { team: true } } },
    }),
  character: (slug: string) =>
    db.character.findUnique({
      where: { slug },
      include: {
        upgradeGoals: { orderBy: { createdAt: "desc" } },
        teamMembers: { include: { team: true }, orderBy: { position: "asc" } },
      },
    }),
  teams: () =>
    db.team.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        teamMembers: {
          include: { character: true },
          orderBy: { position: "asc" },
        },
      },
    }),
  team: (id: string) =>
    db.team.findUnique({
      where: { id },
      include: {
        teamMembers: {
          include: { character: true },
          orderBy: { position: "asc" },
        },
      },
    }),
  goals: () =>
    db.upgradeGoal.findMany({
      include: { character: true },
      orderBy: { updatedAt: "desc" },
    }),
  export: async () => {
    const [characters, teams, teamMembers, upgradeGoals] = await Promise.all([
      db.character.findMany(),
      db.team.findMany(),
      db.teamMember.findMany(),
      db.upgradeGoal.findMany(),
    ]);
    return buildExport({
      characters: characters.map((x) => ({
        ...x,
        createdAt: x.createdAt.toISOString(),
        updatedAt: x.updatedAt.toISOString(),
      })),
      teams: teams.map((x) => ({
        ...x,
        createdAt: x.createdAt.toISOString(),
        updatedAt: x.updatedAt.toISOString(),
      })),
      teamMembers,
      upgradeGoals: upgradeGoals.map((x) => ({
        ...x,
        createdAt: x.createdAt.toISOString(),
        updatedAt: x.updatedAt.toISOString(),
      })),
    });
  },
};
