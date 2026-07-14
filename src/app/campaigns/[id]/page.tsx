import { connection } from "next/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCampaign } from "@/services/campaign-event.service";
import { Badge, fieldClass, PageHeader, Panel, Stat } from "@/components/ui";
import { saveCampaignClassification, saveCampaignPlan } from "../actions";
const statuses = [
  "NOT_STARTED",
  "ACTIVE",
  "BLOCKED",
  "PAUSED",
  "COMPLETED",
  "NEEDS_REVIEW",
] as const;
const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "HOLD"] as const;
export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [campaign, teams] = await Promise.all([
    getCampaign(id),
    db.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!campaign) notFound();
  return (
    <>
      <PageHeader
        eyebrow={campaign.externalCampaignId}
        title={campaign.displayName}
        description="Upstream progress facts are separated from your local objective, team, and strategy."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Panel>
          <Stat label="Type" value={campaign.normalizedType} />
        </Panel>
        <Panel>
          <Stat
            label="Battle records"
            value={campaign.progress?.battleRecordCount ?? 0}
          />
        </Panel>
        <Panel>
          <Stat label="Completion" value="Unknown" />
        </Panel>
        <Panel>
          <Stat label="Stars" value="Unknown" />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="font-semibold">Local campaign plan</h2>
          <form action={saveCampaignPlan} className="mt-4 grid gap-3">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <label className="text-xs text-zinc-400">
              Status
              <select
                className={fieldClass}
                name="status"
                defaultValue={campaign.plan?.status ?? "NEEDS_REVIEW"}
              >
                {statuses.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Priority
              <select
                className={fieldClass}
                name="priority"
                defaultValue={campaign.plan?.priority ?? "MEDIUM"}
              >
                {priorities.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Preferred team
              <select
                className={fieldClass}
                name="preferredTeamId"
                defaultValue={campaign.plan?.preferredTeamId ?? ""}
              >
                <option value="">None</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {[
              [
                "currentObjective",
                "Current objective",
                campaign.plan?.currentObjective,
              ],
              [
                "targetObjective",
                "Target objective",
                campaign.plan?.targetObjective,
              ],
              [
                "blockerSummary",
                "Manual blocker",
                campaign.plan?.blockerSummary,
              ],
              [
                "targetDate",
                "Target date",
                campaign.plan?.targetDate?.toISOString().slice(0, 10),
              ],
            ].map(([name, label, value]) => (
              <label key={String(name)} className="text-xs text-zinc-400">
                {label}
                <input
                  type={name === "targetDate" ? "date" : "text"}
                  className={fieldClass}
                  name={String(name)}
                  defaultValue={String(value ?? "")}
                />
              </label>
            ))}
            <label className="text-xs text-zinc-400">
              Strategy notes
              <textarea
                className={fieldClass}
                name="strategyNotes"
                rows={4}
                defaultValue={campaign.plan?.strategyNotes ?? ""}
              />
            </label>
            <button className="border border-amber-300 bg-amber-300 px-4 py-2 text-sm text-black">
              Save plan
            </button>
          </form>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <h2 className="font-semibold">Evidence-aware blockers</h2>
            <div className="mt-3 space-y-2">
              {campaign.blockers.map((b, i) => (
                <div
                  key={`${b.evidence}-${i}`}
                  className="border border-white/10 p-3 text-sm"
                >
                  <Badge value={b.evidence} />
                  <p className="mt-2 text-zinc-400">{b.label}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2 className="font-semibold">Manual naming and classification</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Manual values survive synchronization.
            </p>
            <form
              action={saveCampaignClassification}
              className="mt-3 grid gap-3"
            >
              <input type="hidden" name="campaignId" value={campaign.id} />
              <input
                className={fieldClass}
                name="displayName"
                defaultValue={campaign.displayName}
              />
              <select
                className={fieldClass}
                name="normalizedType"
                defaultValue={campaign.normalizedType}
              >
                {["STANDARD", "MIRROR", "ELITE", "EVENT", "UNKNOWN"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
              <button className="border border-white/15 p-2 text-sm">
                Save classification
              </button>
            </form>
          </Panel>
        </div>
      </div>
      <Panel className="mt-6">
        <h2 className="font-semibold">Progress limitations and history</h2>
        <p className="mt-2 text-sm text-zinc-400">
          The API supplies attempt counters only. Completion, stars, unlock
          state, and required units remain unknown.
        </p>
        <div className="mt-4 divide-y divide-white/10">
          {campaign.changes.length ? (
            campaign.changes.map((c) => (
              <p className="py-2 text-xs text-zinc-500" key={c.id}>
                {c.createdAt.toLocaleString()} · {c.field}:{" "}
                {c.previousValue ?? "—"} → {c.newValue ?? "—"}
              </p>
            ))
          ) : (
            <p className="text-xs text-zinc-500">
              No synchronized changes recorded.
            </p>
          )}
          {campaign.plan?.changes.map((c) => (
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
