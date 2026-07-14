import { connection } from "next/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge, fieldClass, PageHeader, Panel, Stat } from "@/components/ui";
import { getEvent } from "@/services/campaign-event.service";
import { saveEventClassification, saveEventPlan } from "../actions";
const statuses = [
  "NOT_STARTED",
  "ACTIVE",
  "BLOCKED",
  "PAUSED",
  "COMPLETED",
  "NEEDS_REVIEW",
] as const;
const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "HOLD"] as const;
export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [event, teams] = await Promise.all([
    getEvent(id),
    db.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!event) notFound();
  const raw = event.progress
    ? (JSON.parse(event.progress.rawProgressJson) as {
        lanes?: Array<{
          id?: number;
          name?: string;
          progress?: unknown[];
          battleConfigs?: Array<{
            objectives?: unknown[];
            disallowedFactions?: unknown[];
          }>;
        }>;
      })
    : {};
  return (
    <>
      <PageHeader
        eyebrow={event.externalEventId}
        title={event.displayName}
        description="Exact upstream counters and lane data, separated from local planning."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="space-y-6">
          <Panel>
            <Stat
              label="Points"
              value={event.progress?.currentPoints ?? "Unknown"}
            />
          </Panel>
          <Panel>
            <h2 className="font-semibold">Manual naming and classification</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Manual values survive synchronization.
            </p>
            <form action={saveEventClassification} className="mt-3 grid gap-3">
              <input type="hidden" name="eventId" value={event.id} />
              <input
                className={fieldClass}
                name="displayName"
                defaultValue={event.displayName}
              />
              <select
                className={fieldClass}
                name="eventType"
                defaultValue={event.eventType}
              >
                {[
                  "LEGENDARY_EVENT",
                  "CAMPAIGN_EVENT",
                  "QUEST",
                  "SURVIVAL",
                  "INCURSION",
                  "UNKNOWN",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <button className="border border-white/15 p-2 text-sm">
                Save classification
              </button>
            </form>
          </Panel>
        </div>
        <Panel>
          <Stat
            label="Currency"
            value={event.progress?.currentCurrency ?? "Unknown"}
          />
        </Panel>
        <Panel>
          <Stat
            label="Shards"
            value={event.progress?.currentShards ?? "Unknown"}
          />
        </Panel>
        <Panel>
          <Stat label="Lanes" value={event.progress?.laneCount ?? 0} />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="font-semibold">Local event plan</h2>
          <form action={saveEventPlan} className="mt-4 grid gap-3">
            <input type="hidden" name="eventId" value={event.id} />
            <select
              className={fieldClass}
              name="status"
              defaultValue={event.plan?.status ?? "NEEDS_REVIEW"}
            >
              {statuses.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              className={fieldClass}
              name="priority"
              defaultValue={event.plan?.priority ?? "MEDIUM"}
            >
              {priorities.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              className={fieldClass}
              name="preferredTeamId"
              defaultValue={event.plan?.preferredTeamId ?? ""}
            >
              <option value="">No preferred team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {[
              [
                "currentObjective",
                "Current objective",
                event.plan?.currentObjective,
              ],
              [
                "targetObjective",
                "Target objective",
                event.plan?.targetObjective,
              ],
              ["blockerSummary", "Manual blocker", event.plan?.blockerSummary],
              [
                "targetDate",
                "Target date",
                event.plan?.targetDate?.toISOString().slice(0, 10),
              ],
            ].map(([n, l, v]) => (
              <label className="text-xs text-zinc-400" key={String(n)}>
                {l}
                <input
                  className={fieldClass}
                  type={n === "targetDate" ? "date" : "text"}
                  name={String(n)}
                  defaultValue={String(v ?? "")}
                />
              </label>
            ))}
            <textarea
              className={fieldClass}
              name="strategyNotes"
              rows={4}
              defaultValue={event.plan?.strategyNotes ?? ""}
              placeholder="Strategy notes"
            />
            <button className="border border-amber-300 bg-amber-300 px-4 py-2 text-sm text-black">
              Save plan
            </button>
          </form>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Legendary-event lanes</h2>
            <Badge
              value={event.isActive ? "ACTIVE" : "NOT_CURRENTLY_RUNNING"}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Objectives and restrictions are upstream rules, not roster
            eligibility claims.
          </p>
          <div className="mt-4 space-y-2">
            {(raw.lanes ?? []).map((lane, i) => (
              <div className="border border-white/10 p-3" key={lane.id ?? i}>
                <p className="text-sm font-medium">
                  {lane.name ?? `Lane ${i + 1}`}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {lane.progress?.length ?? 0} recorded progress entries ·{" "}
                  {lane.battleConfigs?.length ?? 0} battle configurations ·{" "}
                  {(lane.battleConfigs ?? []).reduce(
                    (sum, config) => sum + (config.objectives?.length ?? 0),
                    0,
                  )}{" "}
                  objectives ·{" "}
                  {(lane.battleConfigs ?? []).reduce(
                    (sum, config) =>
                      sum + (config.disallowedFactions?.length ?? 0),
                    0,
                  )}{" "}
                  faction restrictions
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel className="mt-6">
        <h2 className="font-semibold">Known limitations</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Start/end dates, reward thresholds, roster eligibility, remaining
          requirements, and success probability are not supplied by the
          inspected Player API.
        </p>
        <div className="mt-4 divide-y divide-white/10">
          {event.changes.map((c) => (
            <p className="py-2 text-xs text-zinc-500" key={c.id}>
              {c.createdAt.toLocaleString()} · {c.field}:{" "}
              {c.previousValue ?? "—"} → {c.newValue ?? "—"}
            </p>
          ))}
          {event.plan?.changes.map((c) => (
            <p className="py-2 text-xs text-zinc-500" key={c.id}>
              {c.createdAt.toLocaleString()} · plan {c.field}:{" "}
              {c.previousValue ?? "—"} → {c.newValue ?? "—"}
            </p>
          ))}
        </div>
      </Panel>
    </>
  );
}
