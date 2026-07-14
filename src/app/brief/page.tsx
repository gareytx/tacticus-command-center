import Link from "next/link";
import { connection } from "next/server";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Stat,
  fieldClass,
} from "@/components/ui";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { TimeBudgetPanel } from "@/components/recommendations/time-budget-panel";
import { getCommandBrief } from "@/services/command-brief.service";
import { db } from "@/lib/db";
import {
  saveStrategicObjective,
  showAnotherReflection,
  toggleReflection,
} from "@/app/recommendations/actions";
import { SCORE_DISCLAIMER } from "@/lib/recommendations/explanations";

const view = (
  r: NonNullable<Awaited<ReturnType<typeof getCommandBrief>>["primary"]>,
) => ({ ...r, generatedAt: r.generatedAt.toISOString() });
export default async function BriefPage() {
  await connection();
  const [brief, characters, campaigns, events, goals] = await Promise.all([
    getCommandBrief(),
    db.character.findMany({
      where: { isOwned: true },
      orderBy: { name: "asc" },
    }),
    db.campaignDefinition.findMany({ orderBy: { displayName: "asc" } }),
    db.eventDefinition.findMany({ orderBy: { displayName: "asc" } }),
    db.upgradeGoal.findMany({
      where: { status: { in: ["PLANNED", "IN_PROGRESS", "BLOCKED"] } },
      include: { character: true },
    }),
  ]);
  const generated = brief.settings.lastRecommendationRunAt;
  return (
    <>
      <PageHeader
        eyebrow="Daily Command Brief"
        title="What should I work on next?"
        description={SCORE_DISCLAIMER}
        action={
          <div className="flex gap-3">
            <Link
              href="/recommendations"
              className="border border-white/15 px-4 py-2 text-sm"
            >
              Review all
            </Link>
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Panel>
          <Stat
            label="Active recommendations"
            value={brief.recommendations.length}
            accent
          />
        </Panel>
        <Panel>
          <Stat label="Selected budget" value={`${brief.budget}m`} />
        </Panel>
        <Panel>
          <p className="text-xs text-zinc-500">Last successful sync</p>
          <p className="mt-2 text-sm">
            {brief.connection?.lastSuccessfulSyncAt?.toLocaleString() ??
              "Never"}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs text-zinc-500">Upstream freshness</p>
          <p className="mt-2 text-sm">
            {brief.connection?.upstreamLastUpdatedAt?.toLocaleString() ??
              "Unknown"}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs text-zinc-500">Generated</p>
          <p className="mt-2 text-sm">
            {generated?.toLocaleString() ?? "Not generated"}
          </p>
        </Panel>
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <TimeBudgetPanel budget={brief.budget} />
        <Panel>
          <h2 className="font-semibold">Current Strategic Objective</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Only an exact selected target influences scoring.
          </p>
          <form action={saveStrategicObjective} className="mt-3 grid gap-2">
            <select
              aria-label="Strategic objective target"
              name="objectiveKey"
              className={fieldClass}
              defaultValue={
                brief.settings.objectiveEntityType &&
                brief.settings.objectiveEntityId
                  ? `${brief.settings.objectiveEntityType}:${brief.settings.objectiveEntityId}`
                  : "GENERAL"
              }
            >
              <option value="GENERAL">General account development</option>
              <optgroup label="Characters">
                {characters.map((c) => (
                  <option value={`CHARACTER:${c.id}`} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Campaigns">
                {campaigns.map((c) => (
                  <option value={`CAMPAIGN:${c.id}`} key={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Events">
                {events.map((e) => (
                  <option value={`EVENT:${e.id}`} key={e.id}>
                    {e.displayName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Goals">
                {goals.map((g) => (
                  <option value={`UPGRADE_GOAL:${g.id}`} key={g.id}>
                    {g.character.name} goal
                  </option>
                ))}
              </optgroup>
            </select>
            <input
              className={fieldClass}
              name="objectiveLabel"
              maxLength={200}
              defaultValue={brief.settings.objectiveLabel ?? ""}
              placeholder="Optional objective wording"
            />
            <button className="border border-amber-300/40 px-4 py-2 text-sm text-amber-300">
              Save objective
            </button>
          </form>
        </Panel>
      </div>
      {brief.primary ? (
        <>
          <Panel className="mb-6 border-amber-300/30">
            <p className="font-mono text-xs tracking-widest text-amber-300">
              PRIMARY FOCUS
            </p>
            <div className="mt-3">
              <RecommendationCard
                recommendation={view(brief.primary)}
                actions={false}
              />
            </div>
          </Panel>
          {brief.next.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-xl font-semibold">Next best actions</h2>
              <div className="space-y-3">
                {brief.next.map((r) => (
                  <RecommendationCard
                    key={r.id}
                    recommendation={view(r)}
                    actions={false}
                  />
                ))}
              </div>
            </section>
          )}
          <div className="mb-6 grid gap-6 xl:grid-cols-3">
            {[
              ["Campaign focus", brief.campaign],
              ["Event focus", brief.event],
              ["Resource caution", brief.resource],
            ].map(([title, item]) => (
              <Panel key={String(title)}>
                <h2 className="font-semibold">{String(title)}</h2>
                {item && typeof item !== "string" ? (
                  <div className="mt-3">
                    <Link
                      className="text-amber-300"
                      href={`/recommendations/${item.id}`}
                    >
                      {item.title}
                    </Link>
                    <p className="mt-2 text-xs text-zinc-500">
                      Score {item.priorityScore} · {item.confidence}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    No eligible recommendation.
                  </p>
                )}
              </Panel>
            ))}
          </div>
          {brief.review.length > 0 && (
            <Panel className="mb-6">
              <h2 className="font-semibold">Review required</h2>
              <div className="mt-3 divide-y divide-white/10">
                {brief.review.map((r) => (
                  <Link
                    className="flex justify-between py-3 text-sm hover:text-amber-300"
                    key={r.id}
                    href={`/recommendations/${r.id}`}
                  >
                    <span>{r.title}</span>
                    <Badge value={r.confidence} />
                  </Link>
                ))}
              </div>
            </Panel>
          )}
          {brief.waiting.length > 0 && (
            <Panel className="mb-6">
              <h2 className="font-semibold">Everything else can wait</h2>
              <p className="mt-2 text-sm text-zinc-500">
                These items fall outside the selected planning-duration
                categories.
              </p>
              <p className="mt-3 text-xs text-zinc-600">
                {brief.waiting.map((r) => r.title).join(" · ")}
              </p>
            </Panel>
          )}
        </>
      ) : (
        <EmptyState
          title="Not enough verified evidence"
          description="Command Center does not yet have enough verified evidence to recommend a specific action. Review priorities, goals, campaign plans, or readiness data."
        />
      )}
      <Panel className="border-cyan-300/20 bg-cyan-950/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-widest text-cyan-300">
              OPTIONAL REFLECTION
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Local-only and completely separate from recommendation scoring.
            </p>
          </div>
          <form action={toggleReflection}>
            <button
              name="enabled"
              value={brief.settings.reflectionEnabled ? "false" : "true"}
              className="border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200"
            >
              {brief.settings.reflectionEnabled ? "Disable" : "Enable"}{" "}
              reflection
            </button>
          </form>
        </div>
        {brief.settings.reflectionEnabled && (
          <div className="mt-5">
            <p className="font-semibold text-cyan-100">
              {brief.reflection.reference}
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              “{brief.reflection.excerpt}”
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              {brief.reflection.reflection}
            </p>
            <form action={showAnotherReflection}>
              <button className="mt-3 text-xs text-cyan-300">
                Show another reflection
              </button>
            </form>
          </div>
        )}
      </Panel>
    </>
  );
}
