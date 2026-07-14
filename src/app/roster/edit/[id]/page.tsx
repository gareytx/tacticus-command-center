import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CharacterForm } from "@/components/character-form";
import { PageHeader } from "@/components/ui";
export default async function EditCharacter({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const character = await db.character.findUnique({ where: { id } });
  if (!character) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Roster administration"
        title={`Edit ${character.name}`}
        description="Update known progression data and leave uncertain fields blank."
      />
      <CharacterForm character={character} error={error} />
    </>
  );
}
