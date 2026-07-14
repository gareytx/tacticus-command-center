import { saveTimeBudget } from "@/app/recommendations/actions";
import { fieldClass, Panel } from "@/components/ui";
export function TimeBudgetPanel({ budget }: { budget: number }) {
  const presets = [10, 20, 30, 45, 60];
  const preset = presets.includes(budget) ? String(budget) : "CUSTOM";
  return (
    <Panel>
      <h2 className="font-semibold">Available play time</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Planning categories only—not measured game duration or energy cost.
      </p>
      <form action={saveTimeBudget} className="mt-3 flex flex-wrap gap-2">
        <select
          aria-label="Available play time"
          name="timeBudget"
          defaultValue={preset}
          className={fieldClass}
        >
          {presets.map((v) => (
            <option value={v} key={v}>
              {v} minutes
            </option>
          ))}
          <option value="CUSTOM">Custom</option>
        </select>
        <input
          aria-label="Custom play time in minutes"
          name="customTimeBudget"
          type="number"
          min={10}
          max={180}
          defaultValue={preset === "CUSTOM" ? budget : 90}
          className={`${fieldClass} w-32`}
        />
        <button className="border border-amber-300/40 px-4 text-sm text-amber-300">
          Apply
        </button>
      </form>
    </Panel>
  );
}
