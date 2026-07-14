import { saveTeam } from "@/app/actions";
import { TEAM_MODES, label } from "@/lib/constants";
import { ButtonLink, Panel, fieldClass } from "./ui";
export function TeamForm({
  team,
  error,
}: {
  team?: { id: string; name: string; mode: string; notes: string | null };
  error?: string;
}) {
  return (
    <form action={saveTeam.bind(null, team?.id)}>
      {error && (
        <div className="mb-4 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <Panel>
        <div className="grid gap-4">
          <label className="text-sm text-zinc-400">
            Team name
            <input
              required
              name="name"
              className={fieldClass}
              defaultValue={team?.name}
            />
          </label>
          <label className="text-sm text-zinc-400">
            Mode
            <select
              required
              name="mode"
              className={fieldClass}
              defaultValue={team?.mode ?? "ARENA"}
            >
              {TEAM_MODES.map((v) => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-400">
            Notes
            <textarea
              name="notes"
              className={`${fieldClass} min-h-32`}
              defaultValue={team?.notes ?? ""}
            />
          </label>
        </div>
      </Panel>
      <div className="mt-4 flex justify-end gap-3">
        <ButtonLink href={team ? `/teams/${team.id}` : "/teams"} secondary>
          Cancel
        </ButtonLink>
        <button className="border border-amber-300 bg-amber-300 px-5 py-2 text-sm font-medium text-black">
          Save team
        </button>
      </div>
    </form>
  );
}
