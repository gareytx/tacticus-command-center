import { db } from "@/lib/db";
import { previewImport } from "@/lib/import-export";
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const [characters, teams, members, goals] = await Promise.all([
      db.character.findMany({ select: { slug: true } }),
      db.team.findMany({ select: { id: true } }),
      db.teamMember.findMany({
        select: { teamId: true, characterId: true, position: true },
      }),
      db.upgradeGoal.findMany({ select: { id: true } }),
    ]);
    const preview = previewImport(
      raw,
      characters.map((x) => x.slug),
      {
        teamIds: teams.map((x) => x.id),
        teamMemberKeys: members.map(
          (x) => `${x.teamId}:${x.characterId}:${x.position}`,
        ),
        goalIds: goals.map((x) => x.id),
      },
    );
    return Response.json(preview, { status: preview.valid ? 200 : 400 });
  } catch {
    return Response.json(
      { valid: false, errors: ["The selected file is not valid JSON."] },
      { status: 400 },
    );
  }
}
