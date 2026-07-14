import { CharacterForm } from "@/components/character-form";
import { PageHeader } from "@/components/ui";
export default async function NewCharacter({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Roster administration"
        title="Add character"
        description="Create a structured character record. Unknown progression fields may be left blank."
      />
      <CharacterForm error={error} />
    </>
  );
}
