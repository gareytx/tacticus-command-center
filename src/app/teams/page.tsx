import { Plus, Users } from "lucide-react";
import { rosterRepository } from "@/data/repository";
import {
  Badge,
  ButtonLink,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui";
export default async function TeamsPage() {
  const teams = await rosterRepository.teams();
  return (
    <>
      <PageHeader
        eyebrow="Formation planning"
        title="Teams"
        description="Maintain squads by mode, including five primary positions and optional substitutes."
        action={
          <ButtonLink href="/teams/new">
            <Plus size={16} />
            Create team
          </ButtonLink>
        }
      />
      {!teams.length ? (
        <EmptyState
          title="No teams configured"
          description="Create your first formation for a campaign or competitive mode."
          action={<ButtonLink href="/teams/new">Create team</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <a href={`/teams/${team.id}`} key={team.id}>
              <Panel className="h-full transition hover:border-amber-300/40">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{team.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {team.teamMembers.length} assigned
                    </p>
                  </div>
                  <Badge value={team.mode} />
                </div>
                <div className="mt-6 flex -space-x-2">
                  {team.teamMembers.slice(0, 5).map((member) => (
                    <span
                      title={member.character.name}
                      key={member.id}
                      className="grid size-9 place-items-center rounded-full border-2 border-[#101618] bg-zinc-800 text-xs font-semibold text-zinc-300"
                    >
                      {member.character.name.slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                  {!team.teamMembers.length && (
                    <Users className="text-zinc-700" />
                  )}
                </div>
                {team.notes && (
                  <p className="mt-5 line-clamp-2 text-sm text-zinc-500">
                    {team.notes}
                  </p>
                )}
              </Panel>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
