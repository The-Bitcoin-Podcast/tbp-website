import { VERDICT_META, VERDICT_ORDER, type Tally } from "./types";

/** A stacked bar of hits, partials, misses and open calls. */
export function TallyBar({ t, height = 10, showPending = true }: { t: Tally; height?: number; showPending?: boolean }) {
  const keys = showPending ? VERDICT_ORDER : VERDICT_ORDER.filter((k) => k !== "pending");
  const total = keys.reduce((n, k) => n + t[k], 0) || 1;
  return (
    <div
      className="flex w-full gap-[2px] overflow-hidden rounded-full bg-surface-light"
      style={{ height }}
      role="img"
      aria-label={keys.map((k) => `${t[k]} ${VERDICT_META[k].label.toLowerCase()}`).join(", ")}
    >
      {keys.map((k) =>
        t[k] ? (
          <div
            key={k}
            style={{ width: `${(t[k] / total) * 100}%`, background: VERDICT_META[k].fill }}
            title={`${VERDICT_META[k].label}: ${t[k]}`}
          />
        ) : null,
      )}
    </div>
  );
}
