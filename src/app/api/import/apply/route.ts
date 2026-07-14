import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { previewImport } from "@/lib/import-export";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const preview = previewImport(raw, []);
    if (!preview.valid) return Response.json(preview, { status: 400 });
    if (preview.records.some((record) => record.action === "reject"))
      return Response.json(
        {
          ok: false,
          error: "Resolve rejected duplicate records before importing.",
        },
        { status: 400 },
      );
    const backupDir = path.join(process.cwd(), "backups");
    await mkdir(backupDir, { recursive: true });
    await copyFile(
      path.join(process.cwd(), "prisma", "dev.db"),
      path.join(
        backupDir,
        `before-import-${new Date().toISOString().replace(/[:.]/g, "-")}.db`,
      ),
    );
    const d = preview.data;
    await db.$transaction(async (tx) => {
      await tx.teamMember.deleteMany();
      await tx.upgradeGoal.deleteMany();
      for (const c of d.characters)
        await tx.character.upsert({
          where: { slug: c.slug },
          update: {
            ...c,
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
          },
          create: {
            ...c,
            createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
            updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
          },
        });
      for (const t of d.teams)
        await tx.team.upsert({
          where: { id: t.id },
          update: { ...t, createdAt: undefined, updatedAt: undefined },
          create: {
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
            updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
          },
        });
      for (const m of d.teamMembers) await tx.teamMember.create({ data: m });
      for (const g of d.upgradeGoals)
        await tx.upgradeGoal.create({
          data: {
            ...g,
            createdAt: g.createdAt ? new Date(g.createdAt) : undefined,
            updatedAt: g.updatedAt ? new Date(g.updatedAt) : undefined,
          },
        });
    });
    return Response.json({ ok: true, backupCreated: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed.",
      },
      { status: 500 },
    );
  }
}
