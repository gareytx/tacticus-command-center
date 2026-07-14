import Link from "next/link";
import { connection as waitForRequest } from "next/server";
import { ArrowRight, Database, Plus, Target, Users } from "lucide-react";
import { rosterRepository } from "@/data/repository";
import { label, RARITIES } from "@/lib/constants";
import { rankValue } from "@/lib/order";
import { Badge, ButtonLink, PageHeader, Panel, Stat } from "@/components/ui";
import { db } from "@/lib/db";

export default async function Dashboard() {
  await waitForRequest();
  const [characters, connection, inventoryCount, recentChanges, recentUnlocks] =
    await Promise.all([
      rosterRepository.characters(),
      db.tacticusConnection.findFirst(),
      db.inventoryItem.count(),
      db.characterChange.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { character: true },
      }),
      db.characterChange.findMany({
        where: { field: "isOwned", newValue: "true" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { character: true },
      }),
    ]);
  const owned = characters.filter((c) => c.isOwned);
  const priorityCount = owned.filter((c) =>
    ["CRITICAL", "HIGH"].includes(c.priority),
  ).length;
  const recent = [...owned]
    .sort((a, b) => +b.updatedAt - +a.updatedAt)
    .slice(0, 5);
  const closest = owned
    .filter((c) =>
      c.upgradeGoals.some(
        (g) => !["COMPLETED", "CANCELLED"].includes(g.status),
      ),
    )
    .sort((a, b) => rankValue(b.rank) - rankValue(a.rank))
    .slice(0, 4);
  const alliances = ["IMPERIAL", "CHAOS", "XENOS"].map((alliance) => ({
    alliance,
    count: owned.filter((c) => c.alliance === alliance).length,
  }));
  return (
    <>
      <PageHeader
        eyebrow="Operational overview"
        title="Roster readiness"
        description="A live snapshot of your collection, investment pressure, and next progression objectives."
        action={
          <ButtonLink href="/roster/new">
            <Plus size={16} />
            Add character
          </ButtonLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Stat label="Owned units" value={owned.length} accent />
          <p className="mt-3 text-xs text-zinc-500">
            {characters.length} total records
          </p>
        </Panel>
        <Panel>
          <Stat label="Priority investments" value={priorityCount} />
          <p className="mt-3 text-xs text-zinc-500">Critical + high</p>
        </Panel>
        {alliances.map((item) => (
          <Panel key={item.alliance}>
            <div className="flex items-start justify-between">
              <Stat label={label(item.alliance)} value={item.count} />
              <Badge value={item.alliance} />
            </div>
          </Panel>
        ))}
      </div>
      {connection?.lastSuccessfulSyncAt && (
        <Panel className="mt-6" data-testid="tacticus-sync-summary">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Synchronized characters"
              value={
                characters.filter((c) => c.syncSource === "TACTICUS").length
              }
              accent
            />
            <Stat label="Inventory items" value={inventoryCount} />
            <div>
              <p className="text-xs text-zinc-500">
                Last successful Tacticus sync
              </p>
              <p className="mt-2 text-sm">
                {connection.lastSuccessfulSyncAt.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Upstream last updated</p>
              <p className="mt-2 text-sm">
                {connection.upstreamLastUpdatedAt?.toLocaleString() ??
                  "Unknown"}
              </p>
            </div>
          </div>
        </Panel>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Panel>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs tracking-widest text-zinc-500">
                NEXT OBJECTIVES
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Closest planned goals
              </h2>
            </div>
            <Link className="text-sm text-amber-300" href="/priorities">
              All goals →
            </Link>
          </div>
          {closest.length ? (
            <div className="divide-y divide-white/10">
              {closest.map((character) => (
                <Link
                  className="group flex items-center justify-between gap-3 py-4"
                  href={`/roster/${character.slug}`}
                  key={character.id}
                >
                  <div>
                    <p className="font-medium group-hover:text-amber-300">
                      {character.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {character.faction} · {label(character.rank)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge value={character.upgradeGoals[0]?.priority} />
                    <ArrowRight size={16} className="text-zinc-600" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">
              No active goals yet. Add one from a character record.
            </p>
          )}
        </Panel>
        <Panel>
          <p className="font-mono text-xs tracking-widest text-zinc-500">
            ROSTER DISTRIBUTION
          </p>
          <h2 className="mt-1 mb-5 text-xl font-semibold">Rarity status</h2>
          <div className="space-y-4">
            {RARITIES.map((rarity) => {
              const count = owned.filter((c) => c.rarity === rarity).length;
              return (
                <div key={rarity}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{label(rarity)}</span>
                    <span className="text-zinc-500">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5">
                    <div
                      className="h-full bg-amber-300"
                      style={{
                        width: `${owned.length ? (count / owned.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <p className="font-mono text-xs tracking-widest text-zinc-500">
            RECENT ACTIVITY
          </p>
          <h2 className="mt-1 mb-4 text-xl font-semibold">Recently updated</h2>
          <div className="grid gap-2">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={`/roster/${c.slug}`}
                className="flex justify-between border border-white/5 bg-white/[.02] p-3 text-sm hover:border-white/15"
              >
                <span>{c.name}</span>
                <span className="text-zinc-600">
                  {c.updatedAt.toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel>
          <p className="font-mono text-xs tracking-widest text-zinc-500">
            QUICK COMMANDS
          </p>
          <h2 className="mt-1 mb-4 text-xl font-semibold">Take action</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["/roster/new", "Add a character", Plus],
              ["/priorities", "View priorities", Target],
              ["/teams", "Manage teams", Users],
              ["/api/export", "Export roster", Database],
            ].map(([href, name, Icon]) => (
              <Link
                key={String(href)}
                href={String(href)}
                className="flex items-center justify-between border border-white/10 bg-white/[.025] p-4 text-sm hover:border-amber-300/50"
              >
                <span>{String(name)}</span>
                <Icon size={17} className="text-amber-300" />
              </Link>
            ))}
          </div>
        </Panel>
        {recentChanges.length > 0 && (
          <Panel>
            <p className="font-mono text-xs tracking-widest text-zinc-500">
              TACTICUS CHANGES
            </p>
            <h2 className="mt-1 mb-4 text-xl font-semibold">
              Recent character changes
            </h2>
            <div className="divide-y divide-white/10">
              {recentChanges.map((change) => (
                <div className="py-2 text-sm" key={change.id}>
                  <span>{change.character.name}</span>
                  <span className="float-right text-zinc-500">
                    {change.field}: {change.previousValue ?? "—"} →{" "}
                    {change.newValue ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        )}
        {recentUnlocks.length > 0 && (
          <Panel>
            <p className="font-mono text-xs tracking-widest text-zinc-500">
              NEWLY UNLOCKED
            </p>
            <h2 className="mt-1 mb-4 text-xl font-semibold">
              Recent roster additions
            </h2>
            <div className="divide-y divide-white/10">
              {recentUnlocks.map((change) => (
                <Link
                  className="flex items-center justify-between py-2 text-sm hover:text-amber-300"
                  href={`/roster/${change.character.slug}`}
                  key={change.id}
                >
                  <span>{change.character.name}</span>
                  <span className="text-xs text-zinc-500">
                    {change.createdAt.toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
