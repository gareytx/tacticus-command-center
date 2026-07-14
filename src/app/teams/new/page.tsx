import { PageHeader } from "@/components/ui";
import { TeamForm } from "@/components/team-form";
export default async function NewTeam({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Formation planning"
        title="Create team"
        description="Set the game mode now, then assign primary members and substitutes."
      />
      <TeamForm error={error} />
    </>
  );
}
