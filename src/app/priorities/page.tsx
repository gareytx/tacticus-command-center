import { updateGoalStatus } from "@/app/actions";
import { rosterRepository } from "@/data/repository";
import { GOAL_STATUSES, PRIORITIES, label } from "@/lib/constants";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  fieldClass,
} from "@/components/ui";
export default async function PrioritiesPage() {
  const goals = await rosterRepository.goals();
  return (
    <>
      <PageHeader
        eyebrow="Progression orders"
        title="Investment priorities"
        description="Upgrade goals grouped by urgency, with status controls for active planning."
      />
      {!goals.length ? (
        <EmptyState
          title="No goals planned"
          description="Open a character record to add your first upgrade goal."
        />
      ) : (
        <div className="space-y-7">
          {PRIORITIES.map((priority) => {
            const items = goals.filter((g) => g.priority === priority);
            return (
              <section key={priority}>
                <div className="mb-3 flex items-center gap-3">
                  <Badge value={priority} />
                  <span className="text-xs text-zinc-600">
                    {items.length} goals
                  </span>
                </div>
                {items.length ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {items.map((g) => (
                      <Panel key={g.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <a
                              className="font-semibold hover:text-amber-300"
                              href={`/roster/${g.character.slug}`}
                            >
                              {g.character.name}
                            </a>
                            <p className="mt-1 text-sm text-zinc-400">
                              {g.targetRank
                                ? `Reach ${label(g.targetRank)}`
                                : g.targetRarity
                                  ? `Reach ${label(g.targetRarity)}`
                                  : g.targetCharacterLevel
                                    ? `Reach level ${g.targetCharacterLevel}`
                                    : "Ability-level target"}
                            </p>
                            {g.reason && (
                              <p className="mt-2 text-xs text-zinc-600">
                                {g.reason}
                              </p>
                            )}
                          </div>
                          <form action={updateGoalStatus.bind(null, g.id)}>
                            <select
                              aria-label={`Status for ${g.character.name}`}
                              name="status"
                              defaultValue={g.status}
                              onChange={(e) =>
                                e.currentTarget.form?.requestSubmit()
                              }
                              className={`${fieldClass} mt-0 min-w-36 py-2`}
                            >
                              {GOAL_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {label(s)}
                                </option>
                              ))}
                            </select>
                          </form>
                        </div>
                      </Panel>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-white/10 p-4 text-sm text-zinc-600">
                    No {label(priority).toLowerCase()} goals.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
