import { notFound } from "next/navigation";
import { Edit3, UserPlus, X } from "lucide-react";
import { addTeamMember, removeTeamMember } from "@/app/actions";
import { rosterRepository } from "@/data/repository";
import {
  Badge,
  ButtonLink,
  PageHeader,
  Panel,
  fieldClass,
} from "@/components/ui";
export default async function TeamDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [team, characters] = await Promise.all([
    rosterRepository.team(id),
    rosterRepository.characters(),
  ]);
  if (!team) notFound();
  const assigned = new Set(team.teamMembers.map((m) => m.characterId));
  return (
    <>
      <PageHeader
        eyebrow="Formation detail"
        title={team.name}
        description={team.notes || "No operating notes recorded."}
        action={
          <ButtonLink href={`/teams/${team.id}/edit`}>
            <Edit3 size={16} />
            Edit team
          </ButtonLink>
        }
      />
      {error && (
        <div className="mb-5 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_.55fr]">
        <Panel>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Formation</h2>
            <Badge value={team.mode} />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((position) => {
              const m = team.teamMembers.find((x) => x.position === position);
              return (
                <div
                  key={position}
                  className="flex min-h-16 items-center justify-between border border-white/10 bg-white/[.02] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center border border-white/10 font-mono text-xs text-zinc-500">
                      {position}
                    </span>
                    {m ? (
                      <div>
                        <a
                          href={`/roster/${m.character.slug}`}
                          className="font-medium hover:text-amber-300"
                        >
                          {m.character.name}
                        </a>
                        <p className="text-xs text-zinc-600">
                          {m.role || "Primary member"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-600">
                        Open primary position
                      </span>
                    )}
                  </div>
                  {m && (
                    <form action={removeTeamMember.bind(null, m.id, team.id)}>
                      <button
                        aria-label={`Remove ${m.character.name}`}
                        className="p-2 text-zinc-600 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
          {team.teamMembers.filter((m) => m.position > 5).length > 0 && (
            <>
              <h3 className="mt-7 mb-3 text-sm font-semibold text-zinc-400">
                Substitutes
              </h3>
              <div className="space-y-2">
                {team.teamMembers
                  .filter((m) => m.position > 5)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between border border-dashed border-white/10 p-3 text-sm"
                    >
                      <span>
                        {m.character.name} · Position {m.position}
                      </span>
                      <form action={removeTeamMember.bind(null, m.id, team.id)}>
                        <button>
                          <X size={15} />
                        </button>
                      </form>
                    </div>
                  ))}
              </div>
            </>
          )}
        </Panel>
        <Panel>
          <div className="mb-5 flex items-center gap-2">
            <UserPlus size={18} className="text-amber-300" />
            <h2 className="text-lg font-semibold">Assign member</h2>
          </div>
          <form action={addTeamMember} className="space-y-4">
            <input type="hidden" name="teamId" value={team.id} />
            <label className="text-sm text-zinc-400">
              Character
              <select required className={fieldClass} name="characterId">
                <option value="">Select character</option>
                {characters
                  .filter((c) => !assigned.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm text-zinc-400">
              Position
              <select className={fieldClass} name="position">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {p <= 5 ? `Primary ${p}` : `Substitute ${p - 5}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-400">
              Role
              <input
                className={fieldClass}
                name="role"
                placeholder="Optional tactical role"
              />
            </label>
            <label className="text-sm text-zinc-400">
              Notes
              <textarea className={fieldClass} name="notes" />
            </label>
            <button
              disabled={characters.length === assigned.size}
              className="w-full border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              Add to team
            </button>
          </form>
        </Panel>
      </div>
    </>
  );
}
