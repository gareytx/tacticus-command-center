import Link from "next/link";
import { connection } from "next/server";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { getStrategyBrief } from "@/services/campaign-event.service";
export default async function BriefPage() {
  await connection();
  const brief = await getStrategyBrief();
  return (
    <>
      <PageHeader
        eyebrow="Strategy brief"
        title="What should I work on next?"
        description="A deterministic ranking from local priorities, objectives, dates, blockers, and explicitly reported activity—not a combat prediction."
      />
      {brief.items.length ? (
        <div className="space-y-3">
          {brief.items.map((item, index) => (
            <Panel key={`${item.kind}-${item.id}`}>
              <div className="flex gap-4">
                <span className="font-mono text-2xl text-amber-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={item.href}
                      className="font-semibold hover:text-amber-300"
                    >
                      {item.label}
                    </Link>
                    <div className="flex gap-2">
                      <Badge value={item.kind} />
                      <Badge value={item.confidence} />
                      <span className="font-mono text-xs text-zinc-500">
                        score {item.score}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{item.reason}</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No campaign or event records"
          description="Synchronize supported progression data to build a strategy brief."
        />
      )}
      {brief.unknowns.length > 0 && (
        <Panel className="mt-6">
          <h2 className="font-semibold">Unknown semantics requiring review</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {brief.unknowns.join(", ")}
          </p>
        </Panel>
      )}
    </>
  );
}
