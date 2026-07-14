import Link from "next/link";
import { connection } from "next/server";
import { Badge, EmptyState, PageHeader, Panel, Stat } from "@/components/ui";
import { getCampaigns, getEvents } from "@/services/campaign-event.service";
export default async function EventsPage() {
  await connection();
  const [events, campaigns] = await Promise.all([getEvents(), getCampaigns()]);
  const campaignEvents = campaigns.filter((c) => c.normalizedType === "EVENT");
  return (
    <>
      <PageHeader
        eyebrow="Phase 2D"
        title="Event intelligence"
        description="Legendary-event progress and verified campaign-event records, with unsupported dates and reward thresholds kept explicit."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Panel>
          <Stat label="Legendary events" value={events.length} accent />
        </Panel>
        <Panel>
          <Stat label="Campaign events" value={campaignEvents.length} />
        </Panel>
        <Panel>
          <Stat
            label="Reported active"
            value={events.filter((e) => e.isActive === true).length}
          />
        </Panel>
      </div>
      {!events.length && !campaignEvents.length ? (
        <EmptyState
          title="No event data synchronized"
          description="Run a previewed Tacticus synchronization to store supported event records."
        />
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <Panel key={e.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <Link
                    className="font-semibold text-amber-300"
                    href={`/events/${e.id}`}
                  >
                    {e.displayName}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {e.progress?.laneCount ?? 0} lanes ·{" "}
                    {e.progress?.currentPoints ?? "Unknown"} points · dates
                    unknown
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge value={e.eventType} />
                  <Badge
                    value={e.isActive ? "ACTIVE" : "NOT_CURRENTLY_RUNNING"}
                  />
                  <Badge value={e.semanticStatus} />
                </div>
              </div>
            </Panel>
          ))}
          {campaignEvents.map((e) => (
            <Panel key={e.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <Link
                    className="font-semibold text-amber-300"
                    href={`/campaigns/${e.id}`}
                  >
                    {e.displayName}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    Campaign event · {e.progress?.battleRecordCount ?? 0}{" "}
                    exposed battle records
                  </p>
                </div>
                <Badge value="CAMPAIGN_EVENT" />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
