import { fieldClass } from "@/components/ui";
import {
  recommendationAction,
  recommendationFeedback,
} from "@/app/recommendations/actions";
export function RecommendationActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-wrap gap-2">
        {status !== "ACTIVE" && (
          <form action={recommendationAction}>
            <input type="hidden" name="recommendationId" value={id} />
            <button
              name="action"
              value="RESTORE"
              className="border border-amber-300/40 px-3 py-2 text-xs text-amber-300"
            >
              Restore
            </button>
          </form>
        )}
        {status === "ACTIVE" && (
          <>
            <form action={recommendationAction}>
              <input type="hidden" name="recommendationId" value={id} />
              <button
                name="action"
                value="COMPLETE"
                className="border border-emerald-300/30 px-3 py-2 text-xs text-emerald-300"
              >
                Mark completed
              </button>
              <button
                name="action"
                value="DISMISS"
                className="ml-2 border border-white/15 px-3 py-2 text-xs"
              >
                Dismiss
              </button>
            </form>
            {[
              ["SNOOZE_TOMORROW", "Tomorrow"],
              ["SNOOZE_3_DAYS", "3 days"],
              ["SNOOZE_1_WEEK", "1 week"],
            ].map(([value, label]) => (
              <form action={recommendationAction} key={value}>
                <input type="hidden" name="recommendationId" value={id} />
                <button
                  name="action"
                  value={value}
                  className="border border-white/15 px-3 py-2 text-xs"
                >
                  Snooze {label}
                </button>
              </form>
            ))}
          </>
        )}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-zinc-500">
          Provide feedback
        </summary>
        <form
          action={recommendationFeedback}
          className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
        >
          <input type="hidden" name="recommendationId" value={id} />
          <select
            aria-label="Feedback response"
            name="response"
            className={fieldClass}
          >
            {[
              "HELPFUL",
              "NOT_HELPFUL",
              "ALREADY_DONE",
              "NOT_APPLICABLE",
              "NEEDS_MORE_CONTEXT",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <input
            name="note"
            maxLength={1000}
            className={fieldClass}
            placeholder="Optional note"
          />
          <button className="border border-white/15 px-4 text-sm">
            Save feedback
          </button>
        </form>
      </details>
    </div>
  );
}
