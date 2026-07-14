import { connection } from "next/server";
import { PageHeader, Panel, Stat, Badge } from "@/components/ui";
import { ReadinessBrowser } from "@/components/readiness-browser";
import { getReadinessView } from "@/services/readiness.service";
import { label } from "@/lib/constants";

export default async function ReadinessPage() {
  await connection();
  const view = await getReadinessView();
  const exactReady = view.opportunities.filter(
    (o) => o.confidence === "EXACT" && o.status === "READY",
  ).length;
  const exactBlocked = view.opportunities.filter(
    (o) => o.confidence === "EXACT" && o.status === "BLOCKED",
  ).length;
  const needsVerification = view.opportunities.filter(
    (o) => o.verification === "NEEDS_REVIEW",
  ).length;
  return (
    <>
      <PageHeader
        eyebrow="Phase 2C"
        title="Upgrade readiness"
        description="Evidence-aware progression opportunities and inventory pressure. Unknown data stays explicit."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Stat label="Characters" value={view.counts.characters} accent />
          <p className="mt-2 text-xs text-zinc-500">Machines excluded</p>
        </Panel>
        <Panel>
          <Stat label="Machines of War" value={view.counts.machines} />
        </Panel>
        <Panel>
          <Stat label="Unknown unit type" value={view.counts.unknown} />
        </Panel>
        <Panel>
          <Stat label="Exact calculations" value={view.counts.exact} />
          <p className="mt-2 text-xs text-zinc-500">
            Only verified local thresholds qualify
          </p>
        </Panel>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Panel>
          <Stat label="Ready now" value={exactReady} />
          <p className="mt-2 text-xs text-zinc-500">
            Exact local thresholds met
          </p>
        </Panel>
        <Panel>
          <Stat label="Blocked" value={exactBlocked} />
          <p className="mt-2 text-xs text-zinc-500">
            Exact local thresholds not met
          </p>
        </Panel>
        <Panel>
          <Stat label="Needs verification" value={needsVerification} />
          <p className="mt-2 text-xs text-zinc-500">
            Review state only; it does not raise confidence
          </p>
        </Panel>
      </div>
      {view.machines.length > 0 && (
        <Panel className="mb-6">
          <h2 className="font-semibold">Machines of War</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Tracked separately from character counts:{" "}
            {view.machines.map((u) => u.name).join(", ")}.
          </p>
        </Panel>
      )}
      {view.unknownUnits.length > 0 && (
        <Panel className="mb-6">
          <h2 className="font-semibold">Classification needs review</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {view.unknownUnits
              .map((u) => `${u.name} (${u.externalId ?? "no external ID"})`)
              .join(", ")}
          </p>
        </Panel>
      )}
      <Panel className="mb-6">
        <h2 className="text-lg font-semibold">Resource pressure</h2>
        <p className="mt-1 text-sm text-zinc-500">
          These signals describe stock levels only. The API does not provide
          upgrade recipes, so they are not asserted as true bottlenecks.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {view.bottlenecks.map((b) => (
            <div className="border border-white/10 p-3" key={b.resourceType}>
              <div className="flex justify-between">
                <b className="text-sm">{label(b.resourceType)}</b>
                <Badge value={b.confidence} />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {b.records} records · {b.zero} empty · {b.low} low
              </p>
            </div>
          ))}
        </div>
      </Panel>
      <ReadinessBrowser opportunities={view.opportunities} />
    </>
  );
}
