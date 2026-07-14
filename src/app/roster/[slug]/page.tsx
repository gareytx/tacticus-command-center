import { notFound } from "next/navigation";
import { Edit3, Trash2 } from "lucide-react";
import { rosterRepository } from "@/data/repository";
import { deleteCharacter, setUnitClassification } from "@/app/actions";
import { Badge, ButtonLink, PageHeader, Panel } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { GoalForm } from "@/components/goal-form";
import { label } from "@/lib/constants";

export default async function CharacterDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  const c = await rosterRepository.character(slug);
  if (!c) notFound();
  const stats = [
    ["Alliance", label(c.alliance)],
    ["Faction", c.faction],
    ["Rarity", label(c.rarity)],
    ["Rank", label(c.rank)],
    [
      "Rank progress",
      c.rankProgress == null ? "Unknown" : `${c.rankProgress}%`,
    ],
    ["Star level", c.starLevel ?? "Unknown"],
    ["Red stars", c.redStarLevel ?? "Unknown"],
    ["Character level", c.characterLevel ?? "Unknown"],
    ["Active ability", c.activeAbilityLevel ?? "Unknown"],
    ["Passive ability", c.passiveAbilityLevel ?? "Unknown"],
    [
      "Shards",
      c.shardsOwned == null
        ? "Unknown"
        : `${c.shardsOwned} / ${c.shardsRequired ?? "?"}`,
    ],
  ];
  return (
    <>
      <PageHeader
        eyebrow={`${c.alliance} / ${c.faction}`}
        title={c.name}
        description={
          c.isOwned ? "Owned roster record" : "Unowned roster record"
        }
        action={
          <div className="flex gap-2">
            <ButtonLink href={`/roster/edit/${c.id}`}>
              <Edit3 size={16} />
              Edit
            </ButtonLink>
            <form action={deleteCharacter.bind(null, c.id)}>
              <ConfirmButton
                message={`Delete ${c.name}? This cannot be undone.`}
                className="grid size-10 place-items-center border border-red-400/30 text-red-300 hover:bg-red-400/10"
              >
                <Trash2 size={16} />
              </ConfirmButton>
            </form>
          </div>
        }
      />
      {error && (
        <div className="mb-5 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-6">
          <Panel>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge value={c.alliance} />
              <Badge value={c.priority} />
              <Badge value={c.investmentStatus} />
              <Badge value={c.unitType} />
            </div>
            <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map(([name, value]) => (
                <div key={String(name)} className="bg-[#101618] p-4">
                  <p className="font-mono text-[10px] tracking-widest text-zinc-600">
                    {name}
                  </p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-3 text-lg font-semibold">Field notes</h2>
            <p className="text-sm leading-6 whitespace-pre-wrap text-zinc-400">
              {c.notes || "No notes recorded."}
            </p>
          </Panel>
          <Panel>
            <h2 className="mb-4 text-lg font-semibold">Team assignments</h2>
            {c.teamMembers.length ? (
              <div className="space-y-2">
                {c.teamMembers.map((m) => (
                  <a
                    href={`/teams/${m.teamId}`}
                    key={m.id}
                    className="flex justify-between border border-white/10 p-3 text-sm hover:border-amber-300/40"
                  >
                    <span>{m.team.name}</span>
                    <span className="text-zinc-500">
                      Position {m.position}
                      {m.role ? ` · ${m.role}` : ""}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Not assigned to a team.</p>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel>
            <h2 className="mb-4 text-lg font-semibold">Upgrade goals</h2>
            {c.upgradeGoals.length ? (
              <div className="mb-5 space-y-3">
                {c.upgradeGoals.map((g) => (
                  <div className="border border-white/10 p-3" key={g.id}>
                    <div className="flex justify-between">
                      <Badge value={g.priority} />
                      <Badge value={g.status} />
                    </div>
                    <p className="mt-3 text-sm">
                      {g.targetRank
                        ? `Target ${label(g.targetRank)}`
                        : g.targetRarity
                          ? `Target ${label(g.targetRarity)}`
                          : g.targetCharacterLevel
                            ? `Target level ${g.targetCharacterLevel}`
                            : "Ability progression"}
                    </p>
                    {g.reason && (
                      <p className="mt-1 text-xs text-zinc-500">{g.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-5 text-sm text-zinc-500">
                No upgrade goals planned.
              </p>
            )}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-amber-300">
                + Add upgrade goal
              </summary>
              <div className="mt-4">
                <GoalForm characterId={c.id} characterSlug={c.slug} />
              </div>
            </details>
          </Panel>
          <Panel>
            <h2 className="mb-2 text-lg font-semibold">Unit classification</h2>
            <p className="mb-3 text-xs text-zinc-500">
              {label(c.unitTypeSource)} · {label(c.unitTypeConfidence)}{" "}
              confidence. A manual choice is preserved during future syncs.
            </p>
            <form
              action={setUnitClassification.bind(null, c.id, c.slug)}
              className="flex gap-2"
            >
              <select
                name="unitType"
                defaultValue={c.unitType}
                className="min-w-0 flex-1 border border-white/10 bg-[#0b1012] p-2 text-sm"
              >
                {["CHARACTER", "MACHINE_OF_WAR", "UNKNOWN"].map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
              <button className="border border-amber-300/40 px-3 text-sm text-amber-300">
                Save
              </button>
            </form>
          </Panel>
          <Panel>
            <p className="text-xs leading-5 text-zinc-600">
              Created {c.createdAt.toLocaleString()}
              <br />
              Updated {c.updatedAt.toLocaleString()}
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
