import { DatabaseBackup, Download, RotateCcw } from "lucide-react";
import { resetDemoData } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { ImportPanel } from "@/components/import-panel";
import { ButtonLink, PageHeader, Panel } from "@/components/ui";
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Data operations"
        title="Data management"
        description="Export, validate, import, back up, or restore the local roster database."
      />
      {reset && (
        <div className="mb-5 border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
          Demo roster restored.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <Download className="text-amber-300" />
            <div>
              <h2 className="font-semibold">Export roster</h2>
              <p className="text-xs text-zinc-500">
                Complete, portable JSON snapshot
              </p>
            </div>
          </div>
          <p className="mb-5 text-sm leading-6 text-zinc-400">
            Exports characters, teams, team members, and upgrade goals with a
            schema version and timestamp.
          </p>
          <ButtonLink href="/api/export">Download JSON export</ButtonLink>
        </Panel>
        <ImportPanel />
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <RotateCcw className="text-amber-300" />
            <div>
              <h2 className="font-semibold">Reset demo data</h2>
              <p className="text-xs text-zinc-500">
                Restore the 11 initial owned records
              </p>
            </div>
          </div>
          <p className="mb-5 text-sm leading-6 text-zinc-400">
            This removes all current characters, teams, and goals before
            restoring the editable demo roster.
          </p>
          <form action={resetDemoData}>
            <ConfirmButton
              message="Reset all local data and restore the demo roster? This cannot be undone."
              className="border border-red-400/40 px-4 py-2 text-sm text-red-300 hover:bg-red-400/10"
            >
              Reset demo data
            </ConfirmButton>
          </form>
        </Panel>
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <DatabaseBackup className="text-amber-300" />
            <div>
              <h2 className="font-semibold">Backup policy</h2>
              <p className="text-xs text-zinc-500">Automatic safety copy</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-400">
            Every confirmed import creates a timestamped SQLite backup in the
            local <code className="text-zinc-300">backups</code> folder before
            any records change.
          </p>
        </Panel>
      </div>
    </>
  );
}
