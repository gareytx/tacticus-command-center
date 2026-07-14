import { notFound } from "next/navigation";
import { rosterRepository } from "@/data/repository";
import { PageHeader } from "@/components/ui";
import { TeamForm } from "@/components/team-form";
export default async function EditTeam({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const team = await rosterRepository.team(id);
  if (!team) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Formation planning"
        title={`Edit ${team.name}`}
        description="Update the formation name, mode, or operating notes."
      />
      <TeamForm team={team} error={error} />
    </>
  );
}
